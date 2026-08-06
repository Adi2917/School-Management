import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticate,
  hashPin,
  issueToken,
  protectCredentials,
  sanitizeRecord,
  verifyPin,
  verifyToken,
} from "./auth.js";

process.env.AUTH_TOKEN_SECRET = "test-only-auth-secret-that-is-long-and-random-enough";

test("PIN hashes verify without exposing the original PIN", async () => {
  const hash = await hashPin("2917");
  assert.match(hash, /^scrypt:/);
  assert.equal(await verifyPin("2917", hash), true);
  assert.equal(await verifyPin("0000", hash), false);
  assert.equal(hash.includes("2917"), false);
});

test("credential protection enforces role PIN length", async () => {
  await assert.rejects(() => protectCredentials("students", { pin: "123" }), /exactly 4 digits/);
  await assert.rejects(() => protectCredentials("schools", { admin_pin: "1234" }), /exactly 6 digits/);
  const student = await protectCredentials("students", { name: "Test Student", pin: "1234" });
  assert.equal(student.pin, undefined);
  assert.ok(student.pin_hash);
});

test("signed tokens reject tampering and retain school scope", () => {
  const token = issueToken({ role: "admin", subject: "admin-1", school_code: "111111" });
  assert.equal(verifyToken(token)?.school_code, "111111");
  assert.equal(verifyToken(`${token}broken`), null);
});

test("authentication migrates a legacy PIN and sanitizes returned data", async () => {
  const updates = [];
  const Model = { updateOne: async (...args) => { updates.push(args); } };
  const result = await authenticate({
    role: "student",
    pin: "1234",
    record: { _id: "mongo-1", id: "student-1", school_code: "111111", name: "Test Student", pin: "1234" },
    Model,
  });
  assert.ok(result?.token);
  assert.equal(result?.user.pin, undefined);
  assert.equal(updates.length, 1);
  assert.equal(sanitizeRecord({ pin: "1234", pin_hash: "secret", name: "Safe" }).name, "Safe");
});
