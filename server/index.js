/* global process */
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "node:crypto";

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
const allowed = new Set(["schools", "students", "fees", "notifications", "results", "exam_types"]);
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : true }));
app.use(express.json({ limit: "12mb" }));
const schema = new mongoose.Schema({}, { strict: false, timestamps: true, versionKey: false });
const modelFor = (name) => mongoose.models[name] || mongoose.model(name, schema, name);
const normalize = (doc) => { const value = doc?.toObject ? doc.toObject() : doc; const { _id, ...rest } = value; return { id: rest.id || _id?.toString(), ...rest }; };
const filterFrom = (params) => Object.fromEntries(Object.entries(params).filter(([key]) => key !== "sort"));
const guard = (req, res, next) => allowed.has(req.params.collection) ? next() : res.status(400).json({ message: "Unknown collection" });

app.get("/api/health", (_req, res) => res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));
app.get("/api/:collection", guard, async (req, res, next) => { try { let query = modelFor(req.params.collection).find(filterFrom(req.query)); if (req.query.sort) { const [field, direction] = req.query.sort.split(":"); query = query.sort({ [field]: direction === "desc" ? -1 : 1 }); } res.json({ data: (await query.lean()).map(normalize) }); } catch (error) { next(error); } });
app.post("/api/:collection", guard, async (req, res, next) => { try { const input = Array.isArray(req.body) ? req.body : [req.body]; const docs = input.map((item) => ({ id: item.id || crypto.randomUUID(), ...item })); res.status(201).json({ data: (await modelFor(req.params.collection).insertMany(docs)).map(normalize) }); } catch (error) { next(error); } });
app.patch("/api/:collection", guard, async (req, res, next) => { try { const filter = filterFrom(req.query); await modelFor(req.params.collection).updateMany(filter, { $set: req.body }); res.json({ data: (await modelFor(req.params.collection).find(filter).lean()).map(normalize) }); } catch (error) { next(error); } });
app.delete("/api/:collection", guard, async (req, res, next) => { try { res.json({ data: await modelFor(req.params.collection).deleteMany(filterFrom(req.query)) }); } catch (error) { next(error); } });
// Express identifies error middleware by its four-argument signature.
// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => res.status(500).json({ message: error.message }));

if (!process.env.MONGODB_URI) { console.error("Missing MONGODB_URI. Add your Atlas connection string to .env"); process.exit(1); }
mongoose.connect(process.env.MONGODB_URI).then(() => app.listen(port, () => console.log(`Connect Your School API: http://localhost:${port}`))).catch((error) => { console.error(error.message); process.exit(1); });
