const express = require("express");
const cors = require("cors");

const app = express();

/* ===================== MIDDLEWARE ===================== */
app.use(cors());
app.use(express.json());

/* ===================== IN-MEMORY STORAGE ===================== */
let sensorData = {
  1: null,
  2: null,
  3: null
};

/* ===================== POST: ESP32 → BACKEND ===================== */
app.post("/api/sensor-data", (req, res) => {
  const {
    zone,
    soil,
    temperature,
    humidity,
    gas,
    light,
    motor
  } = req.body;

  // Basic validation
  if (!zone) {
    return res.status(400).json({ error: "Zone is required" });
  }

  sensorData[zone] = {
    soil,
    temperature,
    humidity,
    gas,
    light,
    motor,
    timestamp: new Date().toISOString()
  };

  console.log(`📡 Data received from Zone ${zone}`, sensorData[zone]);

  res.status(200).json({ status: "received" });
});

/* ===================== GET: WEBSITE / DASHBOARD ===================== */
app.get("/api/sensor-data", (req, res) => {
  res.status(200).json(sensorData);
});

/* ===================== HEALTH CHECK ===================== */
app.get("/", (req, res) => {
  res.send("✅ ESP32 Smart Farming Backend Running");
});

/* ===================== START SERVER ===================== */
const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
