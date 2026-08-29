const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], required: true, default: "user" },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Zone",
    required: false,
  },
  phone: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  resetToken: { type: String, select: false },
  resetTokenExpiry: { type: Date, select: false },
}, { timestamps: true });

userSchema.index({ role: 1 });
userSchema.index({ zoneId: 1 });

module.exports = mongoose.model("User", userSchema);
