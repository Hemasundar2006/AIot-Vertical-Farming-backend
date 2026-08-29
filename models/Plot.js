const mongoose = require("mongoose");

const PlotSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  plotNumber: {
    type: String,
    required: true,
    trim: true,
  },
  area: {
    type: Number, // in Acres
    required: true,
  },
  cropType: {
    type: String,
    required: true,
  },
  sowingDate: {
    type: Date,
    required: true,
  },
  harvestDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["Sowing", "Growing", "Harvested"],
    default: "Sowing",
  },
}, { timestamps: true });

module.exports = mongoose.model("Plot", PlotSchema);
