/* global process */
import mongoose from "mongoose";
import { syncMongoFromSheet } from "../../server/lib/sheetSync.js";

const schema = new mongoose.Schema({}, { strict: false, timestamps: true, versionKey: false });
const modelFor = name => mongoose.models[name] || mongoose.model(name, schema, name);

export default async () => {
  if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI");
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI);
  const result = await syncMongoFromSheet(modelFor);
  console.log("Google Sheet reconciliation:", JSON.stringify(result));
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
};

export const config = { schedule: "*/5 * * * *" };
