const mongoose = require("mongoose");

const monthlyReportSchema = new mongoose.Schema({
  zoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  cloudinaryUrl: { type: String, required: true },
  cloudinaryPublicId: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

monthlyReportSchema.index({ zoneId: 1, year: -1, month: -1 }, { unique: true });

module.exports = mongoose.model("MonthlyReport", monthlyReportSchema);
