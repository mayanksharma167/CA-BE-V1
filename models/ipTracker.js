const mongoose = require("mongoose");

const ipTrackerSchema = new mongoose.Schema({
  ipAddress: { type: String, required: true, unique: true },
  requestCount: { type: Number, default: 1 },
  lastRequest: { type: Date, default: Date.now }
});

module.exports = mongoose.model("IpTracker", ipTrackerSchema);
