/* global process, Buffer */
import mongoose from "mongoose";
import crypto from "node:crypto";

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
const normalize = value => { const { _id, ...rest } = value; return { id: rest.id || _id?.toString(), ...rest }; };
const uniqueFilter = (collection, item) => {
  if (collection === "schools") return { school_code: item.school_code };
  if (collection === "students") return { school_code: item.school_code, number: item.number };
  if (collection === "fees") return { student_id: item.student_id, month: item.month };
  if (collection === "results") return { student_id: item.student_id, exam_type_id: item.exam_type_id, subject: item.subject };
  if (collection === "exam_types") return { name: item.name, school_code: item.school_code };
  return null;
};

export default async function handler(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS" } });
  try {
    await connect();
    const url = new URL(request.url);
    const route = url.pathname.split("/api/").pop().split("/").filter(Boolean);
    if (route[0] === "health") return json({ status: "ok", database: "connected" });
    if (route[0] === "uploads" && request.method === "POST") {
      const form = await request.formData(); const file = form.get("file");
      if (!file || typeof file.arrayBuffer !== "function") return json({ message: "Choose a file" }, 400);
      if (file.size > 5 * 1024 * 1024) return json({ message: "File must be smaller than 5 MB" }, 413);
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
    const Model = modelFor(collection); const filter = Object.fromEntries([...url.searchParams].filter(([key]) => key !== "sort"));
    if (request.method === "GET") { let query = Model.find(filter); const sort = url.searchParams.get("sort"); if (sort) { const [field, direction] = sort.split(":"); query = query.sort({ [field]: direction === "desc" ? -1 : 1 }); } return json({ data: (await query.lean()).map(normalize) }); }
    if (request.method === "POST") {
      const body = await request.json(); const items = Array.isArray(body) ? body : [body]; const saved = [];
      for (const item of items) { const key = uniqueFilter(collection, item); if (key && Object.values(key).every(v => v !== undefined)) { const existing = await Model.findOne(key).lean(); if (existing) { saved.push(normalize(existing)); continue; } } saved.push(normalize((await Model.create({ id: item.id || crypto.randomUUID(), ...item })).toObject())); }
      return json({ data: saved }, 201);
    }
    if (request.method === "PATCH") { await Model.updateMany(filter, { $set: await request.json() }); return json({ data: (await Model.find(filter).lean()).map(normalize) }); }
    if (request.method === "DELETE") return json({ data: await Model.deleteMany(filter) });
    return json({ message: "Method not allowed" }, 405);
  } catch (error) { return json({ message: error.message }, 500); }
}
