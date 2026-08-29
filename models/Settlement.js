const mongoose = require("mongoose");

const SettlementSchema = new mongoose.Schema({
  plot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plot",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  statementId: {
    type: String,
    required: true,
    unique: true,
  },
  statementDate: {
    type: Date,
    default: Date.now,
  },
  cycleStartDate: {
    type: Date,
  },
  cycleEndDate: {
    type: Date,
  },
  totalYieldKg: {
    type: Number,
    required: true,
  },
  marketRate: {
    type: Number,
    required: true,
  },
  grossRevenue: {
    type: Number,
    required: true,
  },
  monthlyServiceFee: {
    type: Number,
    required: true,
  },
  soilReserve: {
    type: Number,
    required: true,
  },
  platformMargin: {
    type: Number,
    required: true,
  },
  netPayout: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["Processing", "Paid"],
    default: "Processing",
  },
}, { timestamps: true });

module.exports = mongoose.model("Settlement", SettlementSchema);
