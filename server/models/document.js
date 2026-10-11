// server/models/document.js
const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    content: { type: String, default: "" }, // TipTap HTML
    owner: { type: String, required: true, index: true }, // user id: eman / ali / sara
    sharedWith: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);