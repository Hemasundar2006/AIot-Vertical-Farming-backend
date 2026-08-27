const mongoose = require("mongoose");

const formSixteenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  financialYear: { type: String, required: true, trim: true }, // e.g. "2025-2026"
  cloudinaryUrl: { type: String, required: true },
  cloudinaryPublicId: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

formSixteenSchema.index({ userId: 1, financialYear: -1 });

module.exports = mongoose.model("FormSixteen", formSixteenSchema);
