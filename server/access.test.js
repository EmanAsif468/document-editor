// server/access.test.js
const test = require("node:test");
const assert = require("node:assert");
const { isOwner, canAccess, checkShare } = require("./access");

const USERS = ["eman", "ali", "sara"];
const makeDoc = (sharedWith = []) => ({ owner: "eman", sharedWith });

test("isOwner: sirf owner ke liye true", () => {
  assert.strictEqual(isOwner(makeDoc(), "eman"), true);
  assert.strictEqual(isOwner(makeDoc(["ali"]), "ali"), false);
});

test("canAccess: owner ko access milta hai", () => {
  assert.strictEqual(canAccess(makeDoc(), "eman"), true);
});

test("canAccess: shared user ko access milta hai", () => {
  assert.strictEqual(canAccess(makeDoc(["ali"]), "ali"), true);
});

test("canAccess: stranger ko access nahi milta", () => {
  assert.strictEqual(canAccess(makeDoc(["ali"]), "sara"), false);
});

test("checkShare: shared user (non-owner) share nahi kar sakta, stranger ko 404", () => {
  const doc = makeDoc(["ali"]);
  const r1 = checkShare(doc, "ali", "sara", USERS);
  assert.strictEqual(r1.ok, false);
  assert.strictEqual(r1.status, 403);
  const r2 = checkShare(doc, "sara", "ali", USERS);
  assert.strictEqual(r2.ok, false);
  assert.strictEqual(r2.status, 404);
});

test("checkShare: owner valid user ko share kar sakta hai, galat cases reject hote hain", () => {
  const doc = makeDoc(["ali"]);
  assert.strictEqual(checkShare(doc, "eman", "sara", USERS).ok, true);
  assert.strictEqual(checkShare(doc, "eman", "nobody", USERS).status, 400);
  assert.strictEqual(checkShare(doc, "eman", "eman", USERS).status, 400);
  assert.strictEqual(checkShare(doc, "eman", "ali", USERS).status, 409);
});