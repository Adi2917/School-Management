/* global process */
import { google } from "googleapis";

export const SHEET_DEFINITIONS = {
  schools: ["id", "school_code", "school_name", "admin_name", "email", "phone", "admin_pin", "location", "school_logo", "created_at", "updated_at"],
  students: ["id", "school_code", "school_name", "name", "father_name", "number", "class", "section", "roll", "pin", "address", "photo_url", "created_at", "updated_at"],
  fees: ["id", "student_id", "school_code", "month", "status", "paid_date", "created_at", "updated_at"],
  notifications: ["id", "school_code", "student_id", "tittle", "message", "image_url", "file_url", "media_type", "created_at", "updated_at"],
  exam_types: ["id", "school_code", "name", "created_at", "updated_at"],
  results: ["id", "student_id", "school_code", "exam_type_id", "subject", "marks", "max_marks", "created_at", "updated_at"],
};

const TAB_NAMES = {
  schools: "Schools",
  students: "Students",
  fees: "Fees",
  notifications: "Notifications",
  exam_types: "Exam Types",
  results: "Results",
};

const configured = () => Boolean(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
const createClient = () => google.sheets({
  version: "v4",
  auth: new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: String(process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  }),
});
const serialize = value => value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
const normalize = value => {
  const raw = value?.toObject ? value.toObject() : value;
  const { _id, __v, sheet_managed: _sheetManaged, ...rest } = raw || {};
  return { id: rest.id || _id?.toString() || "", ...rest };
};

const formatDataTabs = async sheets => {
  const response = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, fields: "sheets.properties" });
  const sheetIds = new Map((response.data.sheets || []).map(item => [item.properties?.title, item.properties?.sheetId]));
  const requests = [];
  for (const [collection, title] of Object.entries(TAB_NAMES)) {
    const sheetId = sheetIds.get(title);
    const columnCount = SHEET_DEFINITIONS[collection].length;
    if (sheetId === undefined) continue;
    requests.push(
      { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
      { repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columnCount },
        cell: { userEnteredFormat: {
          backgroundColor: { red: 0.16, green: 0.15, blue: 0.12 },
          textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
          horizontalAlignment: "CENTER",
        } },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
      } },
      { autoResizeDimensions: { dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: columnCount } } },
      { clearBasicFilter: { sheetId } },
      { setBasicFilter: { filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: columnCount } } } },
    );
  }
  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: { requests },
    });
  }
};

export const ensureSheetStructure = async () => {
  if (!configured()) return { configured: false };
  const sheets = createClient();
  const response = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, fields: "sheets.properties" });
  const existing = new Set((response.data.sheets || []).map(item => item.properties?.title));
  const wanted = ["_Sync Log", ...Object.values(TAB_NAMES)];
  const missing = wanted.filter(title => !existing.has(title));
  if (missing.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: { requests: missing.map(title => ({ addSheet: { properties: { title } } })) },
    });
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "_Sync Log!A1:B5",
    valueInputOption: "RAW",
    requestBody: { values: [
      ["CONNECT YOUR SCHOOL", "MongoDB mirror"],
      ["schema_version", "1"],
      ["sync_mode", "two_way"],
      ["deletion_policy", "missing Sheet row deletes its Sheet-managed MongoDB record"],
      ["last_bootstrap", new Date().toISOString()],
    ] },
  });
  await formatDataTabs(sheets);
  return { configured: true, sheets };
};

const replaceTab = async (sheets, collection, documents) => {
  const tab = TAB_NAMES[collection];
  const columns = SHEET_DEFINITIONS[collection];
  const values = [columns, ...documents.map(item => {
    const document = normalize(item);
    return columns.map(column => serialize(document[column]));
  })];
  await sheets.spreadsheets.values.clear({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: `'${tab}'!A:ZZ` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `'${tab}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
};

export const syncCollectionToSheet = async (collection, Model) => {
  if (!configured() || !SHEET_DEFINITIONS[collection]) return { configured: false };
  const { sheets } = await ensureSheetStructure();
  const documents = await Model.find({}).sort({ school_code: 1, class: 1, section: 1, roll: 1 }).lean();
  await replaceTab(sheets, collection, documents);
  await Model.updateMany({ sheet_managed: { $ne: true } }, { $set: { sheet_managed: true } });
  return { configured: true, rows: documents.length };
};

export const syncAllCollectionsToSheet = async modelFor => {
  if (!configured()) return { configured: false };
  const { sheets } = await ensureSheetStructure();
  const counts = {};
  for (const collection of Object.keys(SHEET_DEFINITIONS)) {
    const documents = await modelFor(collection).find({}).lean();
    await replaceTab(sheets, collection, documents);
    await modelFor(collection).updateMany({ sheet_managed: { $ne: true } }, { $set: { sheet_managed: true } });
    counts[collection] = documents.length;
  }
  return { configured: true, counts };
};

const valuesToDocuments = (values, collection) => {
  if (!values?.length) throw new Error(`${TAB_NAMES[collection]} header is missing`);
  const columns = SHEET_DEFINITIONS[collection];
  if (columns.some((column, index) => String(values[0][index] || "") !== column)) throw new Error(`${TAB_NAMES[collection]} header row was changed`);
  return values.slice(1)
    .filter(row => row.some(cell => String(cell || "").trim()))
    .map(row => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ""])))
    .filter(document => document.id);
};

const readTab = async (sheets, collection) => {
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: `'${TAB_NAMES[collection]}'!A:ZZ` });
  return valuesToDocuments(response.data.values || [], collection);
};

const onlyValidReferences = async (collection, documents, modelFor) => {
  if (collection === "students") {
    const schoolCodes = new Set((await modelFor("schools").distinct("school_code")).map(String));
    return documents.filter(document => schoolCodes.has(String(document.school_code)));
  }
  if (["fees", "results"].includes(collection)) {
    const studentIds = new Set((await modelFor("students").distinct("id")).map(String));
    return documents.filter(document => studentIds.has(String(document.student_id)));
  }
  if (["notifications", "exam_types"].includes(collection)) {
    const schoolCodes = new Set((await modelFor("schools").distinct("school_code")).map(String));
    return documents.filter(document => schoolCodes.has(String(document.school_code)));
  }
  return documents;
};

const deleteStudentChildren = async (ids, modelFor) => {
  if (!ids.length) return;
  await Promise.all([
    modelFor("fees").deleteMany({ student_id: { $in: ids } }),
    modelFor("results").deleteMany({ student_id: { $in: ids } }),
    modelFor("notifications").deleteMany({ student_id: { $in: ids } }),
  ]);
};

const reconcile = async (collection, documents, modelFor) => {
  const Model = modelFor(collection);
  const ids = documents.map(item => item.id);
  const removed = await Model.find({ sheet_managed: true, ...(ids.length ? { id: { $nin: ids } } : {}) }).lean();
  if (collection === "schools" && removed.length) {
    const schoolCodes = removed.map(item => item.school_code);
    const students = await modelFor("students").find({ school_code: { $in: schoolCodes } }).lean();
    await deleteStudentChildren(students.map(item => item.id), modelFor);
    await Promise.all(["students", "notifications", "exam_types", "results", "fees"].map(name => modelFor(name).deleteMany({ school_code: { $in: schoolCodes } })));
  }
  if (collection === "students") await deleteStudentChildren(removed.map(item => item.id), modelFor);
  if (removed.length) await Model.deleteMany({ id: { $in: removed.map(item => item.id) } });
  if (documents.length) {
    await Model.bulkWrite(documents.map(document => ({
      updateOne: { filter: { id: document.id }, update: { $set: { ...document, sheet_managed: true } }, upsert: true },
    })), { ordered: false });
  }
  return { upserted: documents.length, deleted: removed.length };
};

export const syncMongoFromSheet = async modelFor => {
  if (!configured()) return { configured: false };
  const { sheets } = await ensureSheetStructure();
  const result = {};
  for (const collection of Object.keys(SHEET_DEFINITIONS)) {
    const documents = await onlyValidReferences(collection, await readTab(sheets, collection), modelFor);
    result[collection] = await reconcile(collection, documents, modelFor);
  }
  await syncAllCollectionsToSheet(modelFor);
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "_Sync Log!A:B",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[new Date().toISOString(), JSON.stringify(result)]] },
  });
  return { configured: true, result };
};

export const sheetSyncConfigured = configured;
