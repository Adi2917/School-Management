/* global process */
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "node:crypto";
import multer from "multer";
import { pathToFileURL } from "node:url";
import { syncAllCollectionsToSheet, syncCollectionToSheet, syncMongoFromSheet } from "./lib/sheetSync.js";
import { authenticate, bearerClaims, protectCredentials, sanitizeRecord } from "./lib/auth.js";
import { sendStudentPinOtp } from "./lib/mailer.js";

dotenv.config();
export const app = express();
const port = process.env.PORT || 5000;
const allowed = new Set(["schools", "students", "fees", "notifications", "results", "exam_types"]);
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : true }));
app.use(express.json({ limit: "12mb" }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const schema = new mongoose.Schema({}, { strict: false, timestamps: true, versionKey: false });
const modelFor = (name) => mongoose.models[name] || mongoose.model(name, schema, name);
const normalize = (doc) => { const value = sanitizeRecord(doc); const { _id, ...rest } = value; return { id: rest.id || _id?.toString(), ...rest }; };
const filterFrom = (params) => { const raw = Object.fromEntries(Object.entries(params).filter(([key]) => key !== "sort")); if (raw.id && mongoose.Types.ObjectId.isValid(raw.id)) { const { id, ...rest } = raw; return { ...rest, $or: [{ id }, { _id: new mongoose.Types.ObjectId(id) }] }; } return raw; };
const guard = (req, res, next) => {
  if (!allowed.has(req.params.collection)) return res.status(400).json({ message: "Unknown collection" });
  if (req.method === "POST" || req.method === "PATCH") {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const validationError = items.map(item => validateRecord(req.params.collection, item)).find(Boolean);
    if (validationError) return res.status(400).json({ message: validationError });
  }
  next();
};
const validateRecord = (collection, item) => {
  if (collection === "schools" && item.admin_pin !== undefined && !/^\d{6}$/.test(String(item.admin_pin))) return "Admin PIN must contain exactly 6 digits";
  if (collection === "students" && item.pin !== undefined && !/^\d{4}$/.test(String(item.pin))) return "Student PIN must contain exactly 4 digits";
  return "";
};
const sheetAuth = (req, res, next) => {
  const supplied = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.SHEET_SYNC_SECRET || supplied !== process.env.SHEET_SYNC_SECRET) return res.status(401).json({ message: "Unauthorized" });
  next();
};
const mirrorCollection = async (collection, Model) => {
  try { return await syncCollectionToSheet(collection, Model); }
  catch (error) { console.error(`Google Sheet mirror failed for ${collection}:`, error.message); return { error: error.message }; }
};
const recordSchoolCode = async (collection, record) => {
  if (record?.school_code) return String(record.school_code);
  if (["fees", "results"].includes(collection) && record?.student_id) {
    const student = await modelFor("students").findOne(filterFrom({ id: String(record.student_id) })).lean();
    return String(student?.school_code || "");
  }
  return "";
};
const authorizeMutation = async (req, collection, records = []) => {
  if (req.method === "POST" && ["schools", "students"].includes(collection)) return true;
  const claims = bearerClaims(req.headers);
  if (!claims) return false;
  if (collection === "students" && claims.role === "student") return records.length > 0 && records.every(record => String(record.id || record._id) === String(claims.subject));
  if (claims.role !== "admin") return false;
  if (!records.length) return false;
  const codes = await Promise.all(records.map(record => recordSchoolCode(collection, record)));
  return codes.every(code => code && code === String(claims.school_code));
};

const authorizeRead = async (req, collection) => {
  const claims = bearerClaims(req.headers);
  if (collection === "schools" && req.query.school_code) return true;
  if (!claims) return false;
  if (claims.role === "student") {
    if (collection === "students") return String(req.query.id || "") === String(claims.subject);
    if (["fees", "results"].includes(collection)) return String(req.query.student_id || "") === String(claims.subject);
    return ["schools", "notifications", "exam_types"].includes(collection) && String(req.query.school_code || "") === String(claims.school_code);
  }
  return claims.role === "admin" && String(req.query.school_code || claims.school_code) === String(claims.school_code);
};

const otpDigest = value => crypto.createHash("sha256").update(String(value)).digest("hex");

app.get("/api/health", (_req, res) => res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));
app.get("/api/stats", async (_req, res, next) => {
  try {
    const [schools, students] = await Promise.all([
      modelFor("schools").countDocuments({}),
      modelFor("students").countDocuments({}),
    ]);
    res.set("Cache-Control", "public, max-age=15, stale-while-revalidate=45");
    res.json({ data: { schools, students } });
  } catch (error) { next(error); }
});
app.post("/api/auth/:role/login", async (req, res, next) => {
  try {
    const role = req.params.role;
    if (!["admin", "student"].includes(role)) return res.status(404).json({ message: "Unknown login type" });
    const { school_code, email, number, pin } = req.body || {};
    const Model = modelFor(role === "admin" ? "schools" : "students");
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const filter = role === "admin"
      ? { school_code: String(school_code || "").trim(), ...(normalizedEmail ? { $or: [{ email: normalizedEmail }, { admin_email: normalizedEmail }] } : {}) }
      : { school_code: String(school_code || ""), number: String(number || "") };
    const records = role === "student" ? await Model.find(filter).lean() : [await Model.findOne(filter).lean()];
    let session = null;
    for (const record of records) { session = await authenticate({ role, pin, record, Model }); if (session) break; }
    if (!session) return res.status(401).json({ message: "Invalid credentials" });
    await mirrorCollection(role === "admin" ? "schools" : "students", Model);
    res.json({ data: session });
  } catch (error) { next(error); }
});
app.post("/api/auth/student/request-pin-reset", async (req, res, next) => {
  try {
    const schoolCode = String(req.body?.school_code || "").trim();
    const number = String(req.body?.number || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const Student = modelFor("students");
    const student = await Student.findOne({ school_code: schoolCode, number, email }).lean();
    if (!student) return res.status(404).json({ message: "No student matches these registered details" });
    const otp = String(crypto.randomInt(1000, 10000));
    await modelFor("pin_reset_otps").deleteMany({ student_id: student.id });
    await modelFor("pin_reset_otps").create({ id: crypto.randomUUID(), student_id: student.id, school_code: schoolCode, digest: otpDigest(otp), expires_at: new Date(Date.now() + 5 * 60 * 1000), attempts: 0 });
    const school = await modelFor("schools").findOne({ school_code: schoolCode }).lean();
    try {
      await sendStudentPinOtp({ to: email, otp, studentName: student.name, schoolName: school?.school_name });
    } catch (mailError) {
      await modelFor("pin_reset_otps").deleteMany({ student_id: student.id });
      throw mailError;
    }
    res.json({ data: { sent: true, masked_email: email.replace(/(^.).*(@.*$)/, "$1***$2") } });
  } catch (error) { next(error); }
});
app.post("/api/auth/student/reset-pin", async (req, res, next) => {
  try {
    const { school_code, number, email, otp, pin } = req.body || {};
    if (!/^\d{4}$/.test(String(otp)) || !/^\d{4}$/.test(String(pin))) return res.status(400).json({ message: "Enter a valid 4-digit code and new PIN" });
    const Student = modelFor("students");
    const student = await Student.findOne({ school_code: String(school_code).trim(), number: String(number).trim(), email: String(email).trim().toLowerCase() }).lean();
    if (!student) return res.status(404).json({ message: "Student not found" });
    const Otp = modelFor("pin_reset_otps");
    const reset = await Otp.findOne({ student_id: student.id, expires_at: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!reset || reset.attempts >= 5 || reset.digest !== otpDigest(otp)) {
      if (reset) await Otp.updateOne({ _id: reset._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ message: "The reset code is invalid or expired" });
    }
    const protectedPin = await protectCredentials("students", { pin });
    await Student.updateOne({ _id: student._id }, { $set: protectedPin, $unset: { pin: "" } });
    await Otp.deleteMany({ student_id: student.id });
    await mirrorCollection("students", Student);
    res.json({ data: { reset: true } });
  } catch (error) { next(error); }
});
app.post("/api/sheet-sync", sheetAuth, async (req, res, next) => {
  try {
    const result = req.query.direction === "from-sheet" ? await syncMongoFromSheet(modelFor) : await syncAllCollectionsToSheet(modelFor);
    res.json({ data: result });
  } catch (error) { next(error); }
});
app.post("/api/uploads", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Choose a file" });
    if (!["image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf"].includes(req.file.mimetype)) return res.status(415).json({ message: "Only JPG, PNG, WebP, MP4 or PDF files are allowed" });
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "media" });
    const stream = bucket.openUploadStream(`${Date.now()}-${req.file.originalname}`, { metadata: { contentType: req.file.mimetype } });
    stream.end(req.file.buffer);
    stream.on("error", next);
    stream.on("finish", () => res.status(201).json({ url: `${req.protocol}://${req.get("host")}/api/uploads/${stream.id}` }));
  } catch (error) { next(error); }
});
app.get("/api/uploads/:id", async (req, res, next) => {
  try {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "media" });
    const id = new mongoose.Types.ObjectId(req.params.id);
    const files = await bucket.find({ _id: id }).toArray();
    if (!files.length) return res.status(404).json({ message: "File not found" });
    res.set("Content-Type", files[0].metadata?.contentType || "application/octet-stream");
    bucket.openDownloadStream(id).on("error", next).pipe(res);
  } catch (error) { next(error); }
});
app.get("/api/:collection", guard, async (req, res, next) => { try { if (!(await authorizeRead(req, req.params.collection))) return res.status(403).json({ message:"You are not allowed to view these records" }); const claims=bearerClaims(req.headers); let filter=filterFrom(req.query); if(claims?.role==="admin" && req.params.collection!=="schools") filter={...filter,school_code:String(claims.school_code)}; let query = modelFor(req.params.collection).find(filter); if (req.query.sort) { const [field, direction] = req.query.sort.split(":"); query = query.sort({ [field]: direction === "desc" ? -1 : 1 }); } let records=(await query.lean()).map(normalize); if(req.params.collection==="schools" && !claims) records=records.map(({school_code,school_name,school_logo,location})=>({school_code,school_name,school_logo,location})); res.json({ data: records }); } catch (error) { next(error); } });
app.post("/api/:collection", guard, async (req, res, next) => { try { const raw = Array.isArray(req.body) ? req.body : [req.body]; if(req.params.collection==="students"){for(const item of raw){const email=String(item.email||"").trim().toLowerCase();if(email&&await modelFor("students").exists({email}))return res.status(409).json({message:"This email is already registered to a student"});item.email=email;}} if (!(await authorizeMutation(req, req.params.collection, raw))) return res.status(403).json({ message:"You are not allowed to change these records" }); const input = await Promise.all(raw.map(async item => ({ ...(await protectCredentials(req.params.collection,item)), sheet_managed:false }))); const Model = modelFor(req.params.collection); const saved = []; if (req.params.collection === "fees" && input.length > 1) { await Model.bulkWrite(input.map(item => ({ updateOne:{ filter:item.fee_type==="exam"?{student_id:item.student_id,fee_type:"exam",exam_fee_id:item.exam_fee_id}:{student_id:item.student_id,fee_type:item.fee_type||"monthly",month:item.month}, update:{ $setOnInsert:{ id:item.id || crypto.randomUUID(), ...item } }, upsert:true } })), { ordered:false }); const records=(await Model.find({ student_id:input[0].student_id }).lean()).map(normalize); await mirrorCollection(req.params.collection,Model); return res.status(201).json({ data:records }); } if(input.length>1){await Model.bulkWrite(input.map(item=>{let key={id:item.id||crypto.randomUUID()};if(req.params.collection==="schools")key={school_code:item.school_code};if(req.params.collection==="students")key={email:String(item.email||"").trim().toLowerCase()};if(req.params.collection==="results")key={student_id:item.student_id,exam_type_id:item.exam_type_id,subject:item.subject};if(req.params.collection==="exam_types")key={name:item.name,school_code:item.school_code};return{updateOne:{filter:key,update:{$setOnInsert:{id:item.id||crypto.randomUUID(),...item}},upsert:true}}}),{ordered:false});await mirrorCollection(req.params.collection,Model);return res.status(201).json({data:input.map(normalize)});} for (const item of input) { let key = null; if (req.params.collection === "schools") key = { school_code: item.school_code }; if (req.params.collection === "students") key = { email: String(item.email || "").trim().toLowerCase() }; if (req.params.collection === "fees") key = item.fee_type === "exam" ? { student_id:item.student_id,fee_type:"exam",exam_fee_id:item.exam_fee_id } : { student_id:item.student_id,fee_type:item.fee_type||"monthly",month:item.month }; if (req.params.collection === "results") key = { student_id: item.student_id, exam_type_id: item.exam_type_id, subject: item.subject }; if (req.params.collection === "exam_types") key = { name:item.name, school_code:item.school_code }; const existing = key ? await Model.findOne(key) : null; saved.push(existing || await Model.create({ id: item.id || crypto.randomUUID(), ...item })); } await mirrorCollection(req.params.collection,Model); res.status(201).json({ data: saved.map(normalize) }); } catch (error) { next(error); } });
app.patch("/api/:collection", guard, async (req, res, next) => { try { const filter = filterFrom(req.query); const Model=modelFor(req.params.collection); const targets=await Model.find(filter).lean(); if (!(await authorizeMutation(req,req.params.collection,targets))) return res.status(403).json({ message:"You are not allowed to change these records" }); const claims=bearerClaims(req.headers); if(req.params.collection==="students" && req.body.pin !== undefined) return res.status(403).json({message: claims?.role==="admin" ? "Admins cannot save or reset a student PIN" : "Use email OTP to reset your PIN"}); const changes=await protectCredentials(req.params.collection,req.body); await Model.updateMany(filter, { $set: { ...changes, sheet_managed:false }, $unset: req.params.collection === "schools" && req.body.admin_pin !== undefined ? { admin_pin:"" } : {} }); const records=(await Model.find(filter).lean()).map(normalize); await mirrorCollection(req.params.collection,Model); res.json({ data:records }); } catch (error) { next(error); } });
app.delete("/api/:collection", guard, async (req, res, next) => { try { const Model=modelFor(req.params.collection); const filter=filterFrom(req.query); const targets=await Model.find(filter).lean(); if (!(await authorizeMutation(req,req.params.collection,targets))) return res.status(403).json({ message:"You are not allowed to delete these records" }); const result=await Model.deleteMany(filter); await mirrorCollection(req.params.collection,Model); res.json({ data:result }); } catch (error) { next(error); } });
// Express identifies error middleware by its four-argument signature.
// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => res.status(Number(error.statusCode) || 500).json({ message: error.message }));

let connectionPromise;
export function connectDatabase() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!process.env.MONGODB_URI) return Promise.reject(new Error("Missing MONGODB_URI"));
  connectionPromise ||= mongoose.connect(process.env.MONGODB_URI);
  return connectionPromise;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  connectDatabase()
    .then(() => app.listen(port, () => console.log(`Connect Your School API: http://localhost:${port}`)))
    .catch((error) => { console.error(error.message); process.exit(1); });
}
