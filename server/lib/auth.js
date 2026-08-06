/* global process, Buffer */
import crypto from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
const tokenSecret = () => process.env.AUTH_TOKEN_SECRET || process.env.SHEET_SYNC_SECRET || "";

export const hashPin = pin => new Promise((resolve, reject) => {
  const salt = crypto.randomBytes(16).toString("hex");
  crypto.scrypt(String(pin), salt, SCRYPT_KEY_LENGTH, (error, key) => {
    if (error) reject(error);
    else resolve(`scrypt:${salt}:${key.toString("hex")}`);
  });
});

export const verifyPin = (pin, storedHash) => new Promise((resolve, reject) => {
  const [algorithm, salt, expectedHex] = String(storedHash || "").split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return resolve(false);
  crypto.scrypt(String(pin), salt, SCRYPT_KEY_LENGTH, (error, key) => {
    if (error) return reject(error);
    const expected = Buffer.from(expectedHex, "hex");
    resolve(expected.length === key.length && crypto.timingSafeEqual(expected, key));
  });
});

export const sanitizeRecord = value => {
  if (!value) return value;
  const raw = value?.toObject ? value.toObject() : value;
  const { admin_pin: _adminPin, pin: _pin, admin_pin_hash: _adminHash, pin_hash: _studentHash, ...safe } = raw;
  return safe;
};

export const protectCredentials = async (collection, input) => {
  const item = { ...input };
  if (collection === "schools" && item.admin_pin !== undefined) {
    if (!/^\d{6}$/.test(String(item.admin_pin))) throw new Error("Admin PIN must contain exactly 6 digits");
    item.admin_pin_hash = await hashPin(item.admin_pin);
    delete item.admin_pin;
  }
  if (collection === "students" && item.pin !== undefined) {
    if (!/^\d{4}$/.test(String(item.pin))) throw new Error("Student PIN must contain exactly 4 digits");
    item.pin_hash = await hashPin(item.pin);
    delete item.pin;
  }
  return item;
};

export const issueToken = claims => {
  const secret = tokenSecret();
  if (!secret) throw new Error("AUTH_TOKEN_SECRET is not configured");
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({ ...claims, iat: now, exp: now + TOKEN_TTL_SECONDS });
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
};

export const verifyToken = token => {
  const secret = tokenSecret();
  if (!secret || !token) return null;
  const [header, payload, signature] = String(token).split(".");
  if (!header || !payload || !signature) return null;
  const expected = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims.exp > Math.floor(Date.now() / 1000) ? claims : null;
  } catch { return null; }
};

export const bearerClaims = headers => {
  const value = typeof headers?.get === "function" ? headers.get("authorization") : headers?.authorization;
  return verifyToken(String(value || "").replace(/^Bearer\s+/i, ""));
};

export const authenticate = async ({ role, pin, record, Model }) => {
  const hashField = role === "admin" ? "admin_pin_hash" : "pin_hash";
  const legacyField = role === "admin" ? "admin_pin" : "pin";
  const valid = record?.[hashField]
    ? await verifyPin(pin, record[hashField])
    : Boolean(record?.[legacyField] && String(record[legacyField]) === String(pin));
  if (!valid) return null;
  if (!record[hashField]) {
    await Model.updateOne({ _id: record._id }, { $set: { [hashField]: await hashPin(pin) }, $unset: { [legacyField]: "" } });
  }
  const safe = sanitizeRecord(record);
  return {
    token: issueToken({ role, subject: safe.id || safe._id?.toString(), school_code: safe.school_code }),
    user: safe,
  };
};
