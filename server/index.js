/* global process */
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "node:crypto";
import multer from "multer";
import { pathToFileURL } from "node:url";

dotenv.config();
export const app = express();
const port = process.env.PORT || 5000;
const allowed = new Set(["schools", "students", "fees", "notifications", "results", "exam_types"]);
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : true }));
app.use(express.json({ limit: "12mb" }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const schema = new mongoose.Schema({}, { strict: false, timestamps: true, versionKey: false });
const modelFor = (name) => mongoose.models[name] || mongoose.model(name, schema, name);
const normalize = (doc) => { const value = doc?.toObject ? doc.toObject() : doc; const { _id, ...rest } = value; return { id: rest.id || _id?.toString(), ...rest }; };
const filterFrom = (params) => Object.fromEntries(Object.entries(params).filter(([key]) => key !== "sort"));
const guard = (req, res, next) => allowed.has(req.params.collection) ? next() : res.status(400).json({ message: "Unknown collection" });

app.get("/api/health", (_req, res) => res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));
app.post("/api/uploads", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Choose a file" });
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
app.get("/api/:collection", guard, async (req, res, next) => { try { let query = modelFor(req.params.collection).find(filterFrom(req.query)); if (req.query.sort) { const [field, direction] = req.query.sort.split(":"); query = query.sort({ [field]: direction === "desc" ? -1 : 1 }); } res.json({ data: (await query.lean()).map(normalize) }); } catch (error) { next(error); } });
app.post("/api/:collection", guard, async (req, res, next) => { try { const input = Array.isArray(req.body) ? req.body : [req.body]; const docs = input.map((item) => ({ id: item.id || crypto.randomUUID(), ...item })); res.status(201).json({ data: (await modelFor(req.params.collection).insertMany(docs)).map(normalize) }); } catch (error) { next(error); } });
app.patch("/api/:collection", guard, async (req, res, next) => { try { const filter = filterFrom(req.query); await modelFor(req.params.collection).updateMany(filter, { $set: req.body }); res.json({ data: (await modelFor(req.params.collection).find(filter).lean()).map(normalize) }); } catch (error) { next(error); } });
app.delete("/api/:collection", guard, async (req, res, next) => { try { res.json({ data: await modelFor(req.params.collection).deleteMany(filterFrom(req.query)) }); } catch (error) { next(error); } });
// Express identifies error middleware by its four-argument signature.
// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => res.status(500).json({ message: error.message }));

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
