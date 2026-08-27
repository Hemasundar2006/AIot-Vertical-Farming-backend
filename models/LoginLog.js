const mongoose = require("mongoose");

const loginLogSchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"] }, // null if login failed before role lookup
  success: { type: Boolean, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
}, { timestamps: true });

loginLogSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model("LoginLog", loginLogSchema);
