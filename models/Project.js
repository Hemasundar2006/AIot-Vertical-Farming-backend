const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    clientName: { type: String },
    videoUrl: { type: String, required: true }, // Cloudinary URL
    videoPublicId: { type: String, required: true }, // Cloudinary Public ID for deletion
    isActive: { type: Boolean, default: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
