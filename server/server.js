// server/server.js
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]); // Pakistan DNS fix for Atlas SRV

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Document = require("./models/document");
const { isOwner, canAccess, checkShare } = require("./access");

// Seeded demo users (mock auth)
const USERS = [
  { id: "eman", name: "Eman" },
  { id: "ali", name: "Ali" },
  { id: "sara", name: "Sara" },
];
const USER_IDS = USERS.map((u) => u.id);

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => res.send("PaperSpace Backend is running!"));
app.get("/api/health", (req, res) =>
  res.json({ message: "PaperSpace server is working!" })
);
app.get("/api/users", (req, res) => res.json(USERS));

// Mock auth: x-user-id header (sirf demo ke liye, spoof ho sakta hai)
function auth(req, res, next) {
  const userId = req.header("x-user-id");
  if (!USER_IDS.includes(userId)) {
    return res.status(401).json({ error: "Unknown or missing user" });
  }
  req.userId = userId;
  next();
}
app.use("/api/documents", auth);

// ---- helpers ----
function validTitle(title) {
  return (
    typeof title === "string" &&
    title.trim().length >= 1 &&
    title.trim().length <= 120
  );
}

// Doc load karo; access na ho ya id galat ho to null (-> 404)
async function loadDoc(req) {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  const doc = await Document.findById(req.params.id);
  if (!doc || !canAccess(doc, req.userId)) return null;
  return doc;
}

function serverError(res, err) {
  console.error(err);
  res.status(500).json({ error: "Server error" });
}

// ---- routes ----
// List: mere documents + mujhse share kiye gaye
app.get("/api/documents", async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [{ owner: req.userId }, { sharedWith: req.userId }],
    }).sort({ updatedAt: -1 });
    res.json(docs);
  } catch (err) {
    serverError(res, err);
  }
});

app.post("/api/documents", async (req, res) => {
  try {
    const { title = "Untitled document", content = "" } = req.body || {};
    if (!validTitle(title)) {
      return res.status(400).json({ error: "Title must be 1-120 characters" });
    }
    if (typeof content !== "string") {
      return res.status(400).json({ error: "Content must be a string" });
    }
    const doc = await Document.create({
      title: title.trim(),
      content,
      owner: req.userId,
    });
    res.status(201).json(doc);
  } catch (err) {
    serverError(res, err);
  }
});

app.get("/api/documents/:id", async (req, res) => {
  try {
    const doc = await loadDoc(req);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json(doc);
  } catch (err) {
    serverError(res, err);
  }
});

// Update: shared user content edit kar sakta hai, rename sirf owner
app.put("/api/documents/:id", async (req, res) => {
  try {
    const doc = await loadDoc(req);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const { title, content } = req.body || {};

    if (title !== undefined) {
      if (!isOwner(doc, req.userId)) {
        return res.status(403).json({ error: "Only the owner can rename" });
      }
      if (!validTitle(title)) {
        return res.status(400).json({ error: "Title must be 1-120 characters" });
      }
      doc.title = title.trim();
    }
    if (content !== undefined) {
      if (typeof content !== "string") {
        return res.status(400).json({ error: "Content must be a string" });
      }
      doc.content = content;
    }

    await doc.save();
    res.json(doc);
  } catch (err) {
    serverError(res, err);
  }
});

app.delete("/api/documents/:id", async (req, res) => {
  try {
    const doc = await loadDoc(req);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (!isOwner(doc, req.userId)) {
      return res.status(403).json({ error: "Only the owner can delete" });
    }
    await doc.deleteOne();
    res.json({ success: true });
  } catch (err) {
    serverError(res, err);
  }
});

// Share: sirf owner
app.post("/api/documents/:id/share", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Document not found" });
    }
    const doc = await Document.findById(req.params.id);
    const targetId = (req.body || {}).userId;
    const result = checkShare(doc, req.userId, targetId, USER_IDS);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    doc.sharedWith.push(targetId);
    await doc.save();
    res.json(doc);
  } catch (err) {
    serverError(res, err);
  }
});

// Bad JSON body
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  next(err);
});

// ---- startup ----
async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");

  // Migration: purane documents (bina owner) ko "eman" assign karo
  const r = await Document.updateMany(
    { $or: [{ owner: { $exists: false } }, { owner: null }, { owner: "" }] },
    { $set: { owner: "eman" } }
  );
  if (r.modifiedCount) console.log(`Migrated ${r.modifiedCount} old documents to eman`);

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch((err) => {
  console.error("Startup failed:", err.message);
  process.exit(1);
});
