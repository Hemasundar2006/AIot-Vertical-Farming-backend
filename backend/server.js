const express = require("express");
const cors = require("cors");

const app = express();

/* Middleware */
app.use(cors());
app.use(express.json());

/* In-memory storage (latest data per zone) */
let sensorData = {};

/* Health check */
app.get("/", (req, res) => {
  res.send("ESP32 Backend Running");
});

/* ===== POST: ESP32 sends data ===== */
app.post("/api/sensor-data", (req, res) => {
  try {
    const { zone, soil, temperature, humidity, motor } = req.body;

    if (
      zone === undefined ||
      soil === undefined ||
      temperature === undefined ||
      humidity === undefined ||
      motor === undefined
    ) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    sensorData[zone] = {
      soil,
      temperature,
      humidity,
      motor,
      time: new Date().toISOString()
    };

    console.log("📡 Data received:", sensorData[zone]);
    res.status(200).json({ status: "ok" });

  } catch (err) {
    console.error("❌ JSON error:", err.message);
    res.status(400).json({ error: "Bad JSON" });
  }
});

/* ===== GET: Dashboard fetches data ===== */
app.get("/api/sensor-data", (req, res) => {
  res.json(sensorData);
});

/* Start server */
app.listen(5000, "0.0.0.0", () => {
  console.log("🚀 Backend running on port 5000");
});
