/* global process */
import "dotenv/config";
import mongoose from "mongoose";
import { syncAllCollectionsToSheet } from "../server/lib/sheetSync.js";
import { protectCredentials } from "../server/lib/auth.js";

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

if (process.argv.includes("--dry-run")) {
  const studentCount = schoolSeeds.length * classes.length * sections.length * 8;
  console.log(`Validated demo plan: ${schoolSeeds.length} schools, ${classes.length} classes, ${sections.length} sections, ${studentCount} students.`);
  process.exit(0);
}

const schema = new mongoose.Schema({}, { strict: false, timestamps: true, versionKey: false });
const modelFor = name => mongoose.models[name] || mongoose.model(name, schema, name);
const avatar = seed => `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=f6bd3b&fontFamily=Arial`;

const createdAt = new Date().toISOString();
const schools = await Promise.all(schoolSeeds.map(async ([schoolCode, schoolName, adminName, city], index) => protectCredentials("schools", {
  id: `demo-school-${schoolCode}`,
  school_code: schoolCode,
  school_name: schoolName,
  admin_name: adminName,
  email: `connectyourschool+admin${index + 1}@gmail.com`,
  admin_email: `connectyourschool+admin${index + 1}@gmail.com`,
  phone: String(9100000001 + index),
  admin_pin: "123456",
  location: `${city}, India`,
  school_logo: avatar(schoolName),
  monthly_fees: Object.fromEntries(classes.map((className, classIndex) => [className, 500 + classIndex * 50])),
  exam_fees: [{ id:"annual-exam",name:"Annual Examination",type:"Final",class_amounts:Object.fromEntries(classes.map((className,classIndex)=>[className,800+classIndex*50])) }],
  sheet_managed: true,
  created_at: createdAt,
})));

const studentSeeds = [];
for (let schoolIndex = 0; schoolIndex < schools.length; schoolIndex += 1) {
  const school = schools[schoolIndex];
  for (let classIndex = 0; classIndex < classes.length; classIndex += 1) {
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
      for (let roll = 1; roll <= 8; roll += 1) {
        const serial = schoolIndex * 312 + classIndex * 24 + sectionIndex * 8 + roll;
        const name = `${firstNames[(serial - 1) % firstNames.length]} ${lastNames[schoolIndex]}`;
        studentSeeds.push({
          id: `demo-${school.school_code}-${classes[classIndex]}-${sections[sectionIndex]}-${roll}`,
          name,
          father_name: `${["Rajesh", "Suresh", "Manoj", "Amit", "Deepak"][schoolIndex]} ${lastNames[schoolIndex]}`,
          number: String(7000000000 + serial),
          email: `connectyourschool+student${String(serial).padStart(4, "0")}@gmail.com`,
          school_code: school.school_code,
          school_name: school.school_name,
          school_logo: school.school_logo,
          class: classes[classIndex],
          section: sections[sectionIndex],
          roll: String(roll),
          pin: "1234",
          address: school.location,
          photo_url: avatar(name),
          sheet_managed: true,
          created_at: createdAt,
        });
      }
    }
  }
}

if (process.argv.includes("--api")) {
  const apiUrl = String(process.env.DEMO_API_URL || "https://connectyourschool.in/api").replace(/\/$/, "");
  let inserted = 0;
  let preserved = 0;
  for (const school of schools) {
    const loginResponse = await fetch(`${apiUrl}/auth/admin/login`, {
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({school_code:school.school_code,pin:"123456"}),
    });
    if (!loginResponse.ok) throw new Error(`Demo admin login failed for ${school.school_code}`);
    const token = (await loginResponse.json()).data.token;
    const existingResponse = await fetch(`${apiUrl}/students?school_code=${school.school_code}`, {headers:{Authorization:`Bearer ${token}`}});
    if (!existingResponse.ok) throw new Error(`Could not read students for ${school.school_code}`);
    const existing = (await existingResponse.json()).data || [];
    const occupied = new Set(existing.map(item => `${item.class}|${String(item.section).toUpperCase()}|${item.roll}`));
    const knownEmails = new Set(existing.map(item => String(item.email || "").toLowerCase()));
    const pending = studentSeeds.filter(item => item.school_code === school.school_code && !occupied.has(`${item.class}|${item.section}|${item.roll}`) && !knownEmails.has(item.email));
    preserved += existing.length;
    for (let offset=0;offset<pending.length;offset+=24) {
      const response = await fetch(`${apiUrl}/students`, {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(pending.slice(offset,offset+24))});
      if (!response.ok) { const body=await response.json().catch(()=>({})); throw new Error(`${school.school_code} batch ${offset}: ${body.message||response.status}`); }
      inserted += Math.min(24,pending.length-offset);
      console.log(`${school.school_code}: ${Math.min(offset+24,pending.length)}/${pending.length}`);
    }
  }
  console.log(`API seed complete: ${inserted} inserted, ${preserved} existing students preserved.`);
  process.exit(0);
}

const students = [];
for (let offset = 0; offset < studentSeeds.length; offset += 24) {
  students.push(...await Promise.all(studentSeeds.slice(offset, offset + 24).map(document => protectCredentials("students", document))));
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
  updateOne: { filter: { email: document.email }, update: { $set: document }, upsert: true },
})), { ordered: false });
await Promise.all([
  modelFor("schools").collection.createIndex({ school_code:1 }, { unique:true }),
  modelFor("students").collection.createIndex({ email:1 }, { unique:true }),
  modelFor("students").collection.createIndex({ number:1 }, { unique:true }),
  modelFor("students").collection.createIndex({ school_code:1,class:1,section:1,roll:1 }, { unique:true }),
]);

const sheet = await syncAllCollectionsToSheet(modelFor);
console.log(`Seeded ${schools.length} schools and ${students.length} students.`);
console.log("Demo credentials: every admin PIN 123456; every student PIN 1234.");
console.log(`Google Sheet sync: ${sheet.configured ? "complete" : "waiting for credentials"}`);
await mongoose.disconnect();
