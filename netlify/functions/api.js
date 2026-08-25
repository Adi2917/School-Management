/* global process, Buffer */
import mongoose from "mongoose";
import crypto from "node:crypto";
import { syncAllCollectionsToSheet, syncCollectionToSheet, syncMongoFromSheet } from "../../server/lib/sheetSync.js";
import { authenticate, bearerClaims, protectCredentials, sanitizeRecord } from "../../server/lib/auth.js";
import { sendStudentPinOtp } from "../../server/lib/mailer.js";

const allowed = new Set(["schools", "students", "fees", "notifications", "results", "exam_types"]);
const schema = new mongoose.Schema({}, { strict: false, timestamps: true, versionKey: false });
const modelFor = name => mongoose.models[name] || mongoose.model(name, schema, name);
let connectionPromise;
const connect = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!process.env.MONGODB_URI) return Promise.reject(new Error("Missing MONGODB_URI"));
  connectionPromise ||= mongoose.connect(process.env.MONGODB_URI);
  return connectionPromise;
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
const normalize = value => { const { _id, ...rest } = value; return sanitizeRecord({ id: rest.id || _id?.toString(), ...rest }); };
const uniqueFilter = (collection, item) => {
  if (collection === "schools") return { school_code: item.school_code };
  if (collection === "students") return { email: String(item.email || "").trim().toLowerCase() };
  if (collection === "fees") return item.fee_type === "exam" ? { student_id: item.student_id, fee_type: "exam", exam_fee_id: item.exam_fee_id } : { student_id: item.student_id, fee_type: item.fee_type || "monthly", month: item.month };
  if (collection === "results") return { student_id: item.student_id, exam_type_id: item.exam_type_id, subject: item.subject };
  if (collection === "exam_types") return { name: item.name, school_code: item.school_code };
  return null;
};
const validateRecord = (collection, item) => {
  if (collection === "schools" && item.admin_pin !== undefined && !/^\d{6}$/.test(String(item.admin_pin))) return "Admin PIN must contain exactly 6 digits";
  if (collection === "students" && item.pin !== undefined && !/^\d{4}$/.test(String(item.pin))) return "Student PIN must contain exactly 4 digits";
  return "";
};
const authorizedForSheetSync = request => {
  const expected = process.env.SHEET_SYNC_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(expected && supplied && supplied === expected);
};
const mirrorCollection = async (collection, Model) => {
  try {
    return await syncCollectionToSheet(collection, Model);
  } catch (error) {
    console.error(`Google Sheet mirror failed for ${collection}:`, error.message);
    return { configured: true, error: error.message };
  }
};
const sendExpoPush = async ({ schoolCode, studentId = null, audience, title, message, eventType }) => {
  try {
  const tokenFilter={school_code:String(schoolCode),role:audience,...(audience==="student"&&studentId?{subject:String(studentId)}:{})};
  const [tokens,school]=await Promise.all([modelFor("push_tokens").distinct("token",tokenFilter),modelFor("schools").findOne({school_code:String(schoolCode)},{school_name:1}).lean()]);
  if(!tokens.length)return;
  const pushTitle=`${school?.school_name||"Connect Your School"} · ${title}`;
  const payload=tokens.filter(token=>/^Expo(nent)?PushToken\[.+\]$/.test(token)).map(to=>({to,sound:"default",title:pushTitle,body:message,channelId:"school-updates",data:{eventType,schoolCode:String(schoolCode),studentId}}));
  if(!payload.length)return;
  const response=await fetch("https://exp.host/--/api/v2/push/send",{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify(payload)});
  if(!response.ok)console.error(`Expo push service failed (${response.status})`);
  } catch(error) { console.error("Expo push delivery failed:",error.message); }
};
const upsertActivityNotification = async ({ activityKey, schoolCode, studentId = null, audience, title, message, eventType }) => {
  if (!schoolCode || !activityKey) return;
  const now = new Date();
  await modelFor("activity_events").updateOne(
    { activity_key: activityKey },
    { $set: { school_code:String(schoolCode),student_id:studentId,audience,title,tittle:title,message,event_type:eventType,updated_at:now }, $setOnInsert:{ id:crypto.randomUUID(),created_at:now,sheet_managed:false } },
    { upsert:true },
  );
  await sendExpoPush({schoolCode,studentId,audience,title,message,eventType});
};
const refreshSchoolLedgerAmounts = async school => {
  if (!school?.school_code) return;
  const students = await modelFor("students").find({ school_code:String(school.school_code) }, { id:1, class:1 }).lean();
  const operations = [];
  for (const className of Object.keys(school.monthly_fees || {})) {
    const studentIds = students.filter(student => String(student.class) === className).map(student => String(student.id || student._id));
    if (!studentIds.length) continue;
    operations.push({ updateMany:{ filter:{ student_id:{ $in:studentIds }, $or:[{ fee_type:"monthly" },{ fee_type:{ $exists:false } }] }, update:{ $set:{ amount:Number(school.monthly_fees[className] || 0) } } } });
    for (const exam of school.exam_fees || []) operations.push({ updateMany:{ filter:{ student_id:{ $in:studentIds },fee_type:"exam",exam_fee_id:exam.id }, update:{ $set:{ amount:Number(exam.class_amounts?.[className] || 0),title:`${exam.name} · ${exam.type}`,month:exam.name } } } });
  }
  if (operations.length) await modelFor("fees").bulkWrite(operations, { ordered:false });
};
const recordSchoolCode = async (collection, record) => {
  if (record?.school_code) return String(record.school_code);
  if (["fees", "results"].includes(collection) && record?.student_id) {
    const student = await modelFor("students").findOne({ $or: [{ id: String(record.student_id) }, ...(mongoose.Types.ObjectId.isValid(record.student_id) ? [{ _id: new mongoose.Types.ObjectId(record.student_id) }] : [])] }).lean();
    return String(student?.school_code || "");
  }
  return "";
};
const authorizeMutation = async (request, collection, records = []) => {
  if (request.method === "POST" && ["schools", "students"].includes(collection)) return true;
  const claims = bearerClaims(request.headers);
  if (!claims) return false;
  if (collection === "students" && claims.role === "student") return records.length > 0 && records.every(record => String(record.id || record._id) === String(claims.subject));
  if (claims.role !== "admin") return false;
  if (!records.length) { const requested=new URL(request.url).searchParams.get("school_code");return Boolean(requested&&String(requested)===String(claims.school_code)); }
  const codes = await Promise.all(records.map(record => recordSchoolCode(collection, record)));
  return codes.every(code => code && code === String(claims.school_code));
};
const authorizeRead = async (request, collection, filter) => {
  const claims = bearerClaims(request.headers);
  if (collection === "schools" && filter.school_code) return true;
  if (!claims) return false;
  if (claims.role === "student") {
    if (collection === "students") return String(filter.id || "") === String(claims.subject);
    if (["fees", "results"].includes(collection)) return String(filter.student_id || "") === String(claims.subject);
    return ["schools", "notifications", "exam_types"].includes(collection) && String(filter.school_code || "") === String(claims.school_code);
  }
  return claims.role === "admin";
};
const otpDigest = value => crypto.createHash("sha256").update(String(value)).digest("hex");

export default async function handler(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS" } });
  try {
    await connect();
    const url = new URL(request.url);
    const route = url.pathname.split("/api/").pop().split("/").filter(Boolean);
    if (route[0] === "health") return json({ status: "ok", database: "connected" });
    if (route[0] === "stats" && request.method === "GET") {
      const [schools, students] = await Promise.all([
        modelFor("schools").countDocuments({}),
        modelFor("students").countDocuments({}),
      ]);
      return new Response(JSON.stringify({ data: { schools, students } }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=15, stale-while-revalidate=45",
        },
      });
    }
    if(route[0]==="push"&&route[1]==="register"&&request.method==="POST"){
      const claims=bearerClaims(request.headers);if(!claims)return json({message:"Unauthorized"},401);
      const body=await request.json();const token=String(body.token||"").trim();
      if(!/^Expo(nent)?PushToken\[.+\]$/.test(token))return json({message:"Invalid Expo push token"},400);
      await modelFor("push_tokens").updateOne({token},{$set:{token,role:claims.role,subject:String(claims.subject),school_code:String(claims.school_code),platform:String(body.platform||"unknown"),updated_at:new Date()}},{upsert:true});
      return json({data:{registered:true}});
    }
    if (route[0] === "sheet-sync" && request.method === "POST") {
      if (!authorizedForSheetSync(request)) return json({ message: "Unauthorized" }, 401);
      const direction = url.searchParams.get("direction") || "to-sheet";
      const result = direction === "from-sheet"
        ? await syncMongoFromSheet(modelFor)
        : await syncAllCollectionsToSheet(modelFor);
      return json({ data: result });
    }
    if (route[0] === "auth" && route[2] === "login" && request.method === "POST") {
      const role = route[1];
      if (!new Set(["admin", "student"]).has(role)) return json({ message: "Invalid account type" }, 400);
      const body = await request.json();
      const Model = modelFor(role === "admin" ? "schools" : "students");
      const normalizedEmail = String(body.email || "").trim().toLowerCase();
      const filter = role === "admin"
        ? { school_code: String(body.school_code || "").trim(), ...(normalizedEmail ? { $or: [{ email: normalizedEmail }, { admin_email: normalizedEmail }] } : {}) }
        : { school_code: String(body.school_code || "").trim(), number: String(body.number || "").trim() };
      const records = role === "student" ? await Model.find(filter) : [await Model.findOne(filter)];
      let auth = null;
      for (const record of records) { auth = await authenticate({ role, pin: String(body.pin || ""), record, Model }); if (auth) break; }
      if (!auth) return json({ message: "Invalid login details" }, 401);
      void mirrorCollection(role === "admin" ? "schools" : "students", Model);
      return json({ data: auth });
    }
    if (route[0] === "auth" && route[1] === "student" && route[2] === "request-pin-reset" && request.method === "POST") {
      const body = await request.json(); const email=String(body.email||"").trim().toLowerCase();
      const Student=modelFor("students"); const student=await Student.findOne({school_code:String(body.school_code||"").trim(),number:String(body.number||"").trim(),email}).lean();
      if(!student) return json({message:"No student matches these registered details"},404);
      const otp=String(crypto.randomInt(1000,10000)); const Otp=modelFor("pin_reset_otps"); await Otp.deleteMany({student_id:student.id});
      await Otp.create({id:crypto.randomUUID(),student_id:student.id,school_code:student.school_code,digest:otpDigest(otp),expires_at:new Date(Date.now()+300000),attempts:0});
      const school=await modelFor("schools").findOne({school_code:student.school_code}).lean();
      try { await sendStudentPinOtp({to:email,otp,studentName:student.name,schoolName:school?.school_name}); }
      catch(mailError){await Otp.deleteMany({student_id:student.id});throw mailError;}
      return json({data:{sent:true,masked_email:email.replace(/(^.).*(@.*$)/,"$1***$2")}});
    }
    if (route[0] === "auth" && route[1] === "student" && route[2] === "reset-pin" && request.method === "POST") {
      const body=await request.json(); if(!/^\d{4}$/.test(String(body.otp))||!/^\d{4}$/.test(String(body.pin))) return json({message:"Enter a valid 4-digit code and new PIN"},400);
      const Student=modelFor("students"); const student=await Student.findOne({school_code:String(body.school_code||"").trim(),number:String(body.number||"").trim(),email:String(body.email||"").trim().toLowerCase()}).lean(); if(!student)return json({message:"Student not found"},404);
      const Otp=modelFor("pin_reset_otps"); const reset=await Otp.findOne({student_id:student.id,expires_at:{$gt:new Date()}}).sort({createdAt:-1});
      if(!reset||reset.attempts>=5||reset.digest!==otpDigest(body.otp)){if(reset)await Otp.updateOne({_id:reset._id},{$inc:{attempts:1}});return json({message:"The reset code is invalid or expired"},400);}
      const protectedPin=await protectCredentials("students",{pin:body.pin}); await Student.updateOne({_id:student._id},{$set:protectedPin,$unset:{pin:""}}); await Otp.deleteMany({student_id:student.id}); void mirrorCollection("students",Student); return json({data:{reset:true}});
    }
    if (route[0] === "uploads" && request.method === "POST") {
      const form = await request.formData(); const file = form.get("file");
      if (!file || typeof file.arrayBuffer !== "function") return json({ message: "Choose a file" }, 400);
      if (file.size > 5 * 1024 * 1024) return json({ message: "File must be smaller than 5 MB" }, 413);
      const accepted = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf"]);
      if (!accepted.has(file.type)) return json({ message: "Only JPG, PNG, WebP, MP4 or PDF files are allowed" }, 415);
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "media" });
      const stream = bucket.openUploadStream(`${Date.now()}-${file.name}`, { metadata: { contentType: file.type } });
      stream.end(Buffer.from(await file.arrayBuffer()));
      await new Promise((resolve, reject) => { stream.on("finish", resolve); stream.on("error", reject); });
      return json({ url: `${url.origin}/api/uploads/${stream.id}` }, 201);
    }
    if (route[0] === "uploads" && route[1] && request.method === "GET") {
      const id = new mongoose.Types.ObjectId(route[1]); const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "media" });
      const files = await bucket.find({ _id: id }).toArray(); if (!files.length) return json({ message: "File not found" }, 404);
      const chunks = []; await new Promise((resolve, reject) => bucket.openDownloadStream(id).on("data", chunk => chunks.push(chunk)).on("end", resolve).on("error", reject));
      return new Response(Buffer.concat(chunks), { headers: { "Content-Type": files[0].metadata?.contentType || "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" } });
    }
    const collection = route[0]; if (!allowed.has(collection)) return json({ message: "Unknown API route" }, 404);
    const Model = modelFor(collection); const rawFilter = Object.fromEntries([...url.searchParams].filter(([key]) => key !== "sort"));
    let filter = rawFilter;
    if (rawFilter.id && mongoose.Types.ObjectId.isValid(rawFilter.id)) { const { id, ...rest } = rawFilter; filter = { ...rest, $or: [{ id }, { _id: new mongoose.Types.ObjectId(id) }] }; }
    if (request.method === "GET") { if(!(await authorizeRead(request,collection,rawFilter))) return json({message:"You are not allowed to view these records"},403); const claims=bearerClaims(request.headers); if(claims?.role==="admin" && collection!=="schools") filter={...filter,school_code:String(claims.school_code)}; if(collection==="notifications"){const conditions=[{$or:[{event_type:{$exists:false}},{event_type:"notice"}]}];if(claims?.role==="student")conditions.push({$or:[{audience:{$exists:false}},{audience:"student"},{audience:"all"}]},{$or:[{student_id:null},{student_id:""},{student_id:{$exists:false}},{student_id:String(claims.subject)}]});filter={...filter,$and:conditions};} let query = Model.find(filter); const sort = url.searchParams.get("sort"); if (sort) { const [field, direction] = sort.split(":"); query = query.sort({ [field]: direction === "desc" ? -1 : 1 }); } let records=(await query.lean()).map(normalize); if(collection==="schools"&&!claims)records=records.map(({school_code,school_name,school_logo,location})=>({school_code,school_name,school_logo,location})); return json({ data: records }); }
    if (request.method === "POST") {
      const body = await request.json(); const rawItems = Array.isArray(body) ? body : [body];
      if (collection === "schools") { for (const item of rawItems) if (await Model.exists({ school_code:String(item.school_code||"").trim() })) return json({message:"This school code is already registered"},409); }
      if (collection === "students") { for (const item of rawItems) { const email=String(item.email||"").trim().toLowerCase(); const number=String(item.number||"").trim(); if(email && await Model.exists({email})) return json({message:"This email is already registered to a student"},409); if(number && await Model.exists({number})) return json({message:"This phone number is already registered to a student"},409); item.email=email; item.number=number; } }
      if (!(await authorizeMutation(request, collection, rawItems))) return json({ message: "You are not allowed to change these records" }, 403);
      for (const item of rawItems) { const validationError = validateRecord(collection, item); if (validationError) return json({ message: validationError }, 400); }
      const items = await Promise.all(rawItems.map(async item => ({ ...(await protectCredentials(collection, item)), sheet_managed: false }))); const saved = [];
      if (collection === "fees" && items.length > 1) {
        await Model.bulkWrite(items.map(item => ({ updateOne: { filter: item.fee_type === "exam" ? { student_id:item.student_id,fee_type:"exam",exam_fee_id:item.exam_fee_id } : { student_id:item.student_id,fee_type:item.fee_type || "monthly",month:item.month }, update: { $set: { school_code:item.school_code,student_id:item.student_id,fee_type:item.fee_type || "monthly",month:item.month,amount:Number(item.amount || 0),...(item.exam_fee_id ? { exam_fee_id:item.exam_fee_id } : {}),...(item.title ? { title:item.title } : {}) }, $setOnInsert: { id: item.id || crypto.randomUUID(),status:item.status || "Pending",due_amount:Number(item.due_amount || 0),dues_paid:false,sheet_managed:false } }, upsert: true } })), { ordered: false });
        const records = (await Model.find({ student_id: items[0].student_id }).lean()).map(normalize);
        void mirrorCollection(collection, Model);
        return json({ data: records }, 201);
      }
      if (items.length > 1) {
        await Model.bulkWrite(items.map(item => {
          const key = uniqueFilter(collection, item) || { id: item.id || crypto.randomUUID() };
          return { updateOne: { filter: key, update: { $setOnInsert: { id: item.id || crypto.randomUUID(), ...item } }, upsert: true } };
        }), { ordered: false });
        if(collection==="results"&&items[0])await upsertActivityNotification({activityKey:`result:${items[0].student_id}:${items[0].exam_type_id||items[0].exam_name}`,schoolCode:items[0].school_code,studentId:items[0].student_id,audience:"student",title:"Result updated",message:`Your ${items[0].exam_name||"exam"} result has been published.`,eventType:"result_updated"});
        void mirrorCollection(collection, Model);
        return json({ data: items.map(normalize) }, 201);
      }
      for (const item of items) { const key = uniqueFilter(collection, item); if (key && Object.values(key).every(v => v !== undefined)) { const existing = await Model.findOne(key).lean(); if (existing) { saved.push(normalize(existing)); continue; } } const created=normalize((await Model.create({ id: item.id || crypto.randomUUID(), ...item })).toObject()); saved.push(created); if(collection==="students")await upsertActivityNotification({activityKey:`student:${created.id}`,schoolCode:created.school_code,studentId:created.id,audience:"admin",title:"New student registered",message:`${created.name} joined Class ${created.class}-${created.section}.`,eventType:"student_registered"}); if(collection==="results")await upsertActivityNotification({activityKey:`result:${created.student_id}:${created.exam_type_id||created.exam_name}`,schoolCode:created.school_code,studentId:created.student_id,audience:"student",title:"Result updated",message:`Your ${created.exam_name||"exam"} result has been published.`,eventType:"result_updated"}); if(collection==="notifications")await sendExpoPush({schoolCode:created.school_code,studentId:created.student_id||null,audience:created.audience||"student",title:created.title||created.tittle||"School notice",message:created.message||"A new school notice was published.",eventType:created.event_type||"notice"}); }
      void mirrorCollection(collection, Model);
      return json({ data: saved }, 201);
    }
    if (request.method === "PATCH") { const targets=await Model.find(filter).lean(); if (!(await authorizeMutation(request,collection,targets))) return json({ message:"You are not allowed to change these records" },403); const rawChanges = await request.json(); if(collection==="students"&&rawChanges.pin!==undefined)return json({message:bearerClaims(request.headers)?.role==="admin"?"Admins cannot save or reset a student PIN":"Use email OTP to reset your PIN"},403); const validationError = validateRecord(collection, rawChanges); if (validationError) return json({ message: validationError }, 400); const changes = await protectCredentials(collection, rawChanges); const unset = collection === "schools" && rawChanges.admin_pin !== undefined ? { admin_pin: "" } : undefined; await Model.updateMany(filter, { $set: { ...changes, sheet_managed: false }, ...(unset ? { $unset: unset } : {}) }); const records = (await Model.find(filter).lean()).map(normalize); if(collection==="schools" && (rawChanges.monthly_fees!==undefined || rawChanges.exam_fees!==undefined)) await refreshSchoolLedgerAmounts(records[0]); if(collection==="fees"&&records[0]&&rawChanges.status)await upsertActivityNotification({activityKey:`fee:${records[0].id}`,schoolCode:records[0].school_code,studentId:records[0].student_id,audience:"student",title:"Fee status updated",message:`${records[0].title||records[0].month||"Fee"} is now ${records[0].status}.`,eventType:"fee_updated"}); if(collection==="results"&&records[0])await upsertActivityNotification({activityKey:`result:${records[0].student_id}:${records[0].exam_type_id||records[0].exam_name}`,schoolCode:records[0].school_code,studentId:records[0].student_id,audience:"student",title:"Result updated",message:`Your ${records[0].exam_name||"exam"} result has been published.`,eventType:"result_updated"}); void mirrorCollection(collection, Model); return json({ data: records }); }
    if (request.method === "DELETE") { const targets=await Model.find(filter).lean(); if (!(await authorizeMutation(request,collection,targets))) return json({ message:"You are not allowed to delete these records" },403); const result = await Model.deleteMany(filter); void mirrorCollection(collection, Model); return json({ data: result }); }
    return json({ message: "Method not allowed" }, 405);
  } catch (error) { return json({ message: error.message }, Number(error.statusCode) || 500); }
}
