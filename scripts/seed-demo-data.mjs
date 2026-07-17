/* global process */
import "dotenv/config";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { syncAllCollectionsToSheet } from "../server/lib/sheetSync.js";

const classes = ["Nursery", "LKG", "UKG", ...Array.from({ length: 10 }, (_, index) => String(index + 1))];
const sections = ["A", "B", "C"];
const firstNames = ["Aarav", "Aditi", "Anaya", "Arjun", "Diya", "Ishaan", "Kavya", "Krishna", "Meera", "Rohan"];
const lastNames = ["Sharma", "Kumar", "Verma", "Singh", "Gupta"];
const schoolSeeds = [
  ["410001", "Sunrise Public School", "Anil Sharma", "Delhi"],
  ["410002", "Greenfield Academy", "Neha Verma", "Mumbai"],
  ["410003", "Riverdale International School", "Rakesh Singh", "Patna"],
  ["410004", "Scholars Valley School", "Pooja Gupta", "Ranchi"],
  ["410005", "Bright Future Academy", "Vikram Kumar", "Kolkata"],
];

const schema = new mongoose.Schema({}, { strict: false, timestamps: true, versionKey: false });
const modelFor = name => mongoose.models[name] || mongoose.model(name, schema, name);
const avatar = seed => `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=f6bd3b&fontFamily=Arial`;

const createdAt = new Date().toISOString();
const schools = schoolSeeds.map(([schoolCode, schoolName, adminName, city], index) => ({
  id: crypto.randomUUID(),
  school_code: schoolCode,
  school_name: schoolName,
  admin_name: adminName,
  email: `admin${index + 1}@connectyourschool.in`,
  phone: String(9100000001 + index),
  admin_pin: String(610001 + index),
  location: `${city}, India`,
  school_logo: avatar(schoolName),
  sheet_managed: true,
  created_at: createdAt,
}));

const students = [];
for (let schoolIndex = 0; schoolIndex < schools.length; schoolIndex += 1) {
  const school = schools[schoolIndex];
  for (let classIndex = 0; classIndex < classes.length; classIndex += 1) {
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
      for (let roll = 1; roll <= 5; roll += 1) {
        const serial = schoolIndex * 195 + classIndex * 15 + sectionIndex * 5 + roll;
        const name = `${firstNames[(serial - 1) % firstNames.length]} ${lastNames[schoolIndex]}`;
        students.push({
          id: crypto.randomUUID(),
          name,
          father_name: `${["Rajesh", "Suresh", "Manoj", "Amit", "Deepak"][schoolIndex]} ${lastNames[schoolIndex]}`,
          number: String(7000000000 + serial),
          school_code: school.school_code,
          school_name: school.school_name,
          school_logo: school.school_logo,
          class: classes[classIndex],
          section: sections[sectionIndex],
          roll: String(roll),
          pin: String(1000 + ((serial - 1) % 9000)),
          address: school.location,
          photo_url: avatar(name),
          sheet_managed: true,
          created_at: createdAt,
        });
      }
    }
  }
}

if (process.argv.includes("--dry-run")) {
  console.log(`Validated demo plan: ${schools.length} schools, ${classes.length} classes, ${sections.length} sections, ${students.length} students.`);
  process.exit(0);
}

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing");
await mongoose.connect(process.env.MONGODB_URI);
const databaseName = mongoose.connection.name;

if (process.argv.includes("--reset")) {
  if (["admin", "local", "config"].includes(databaseName)) throw new Error(`Refusing to reset system database ${databaseName}`);
  if (process.env.CONFIRM_RESET_DATABASE !== databaseName) throw new Error(`Set CONFIRM_RESET_DATABASE=${databaseName} before using --reset`);
  await mongoose.connection.db.dropDatabase();
  console.log(`Reset application database: ${databaseName}`);
}

await modelFor("schools").bulkWrite(schools.map(document => ({
  updateOne: { filter: { school_code: document.school_code }, update: { $set: document }, upsert: true },
})), { ordered: false });
await modelFor("students").bulkWrite(students.map(document => ({
  updateOne: { filter: { school_code: document.school_code, number: document.number }, update: { $set: document }, upsert: true },
})), { ordered: false });

const sheet = await syncAllCollectionsToSheet(modelFor);
console.log(`Seeded ${schools.length} schools and ${students.length} students.`);
console.log(`Google Sheet sync: ${sheet.configured ? "complete" : "waiting for credentials"}`);
await mongoose.disconnect();
