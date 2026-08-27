const mongoose = require("mongoose");

const billSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["paid", "pending"], default: "pending" },
  cloudinaryUrl: { type: String, required: true },
  cloudinaryPublicId: { type: String, required: true }, // needed to delete/replace file
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin who uploaded it
}, { timestamps: true });

billSchema.index({ userId: 1, year: -1, month: -1 });

module.exports = mongoose.model("Bill", billSchema);
