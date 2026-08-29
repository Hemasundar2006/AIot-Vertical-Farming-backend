const mongoose = require("mongoose");

const managementPersonSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  designation: { type: String, required: true, trim: true },
  photoUrl: { type: String },
  photoPublicId: { type: String },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  collegeName: { type: String, trim: true },
  description: { type: String, trim: true },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

managementPersonSchema.index({ displayOrder: 1 });

module.exports = mongoose.model("ManagementPerson", managementPersonSchema);
