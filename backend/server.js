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
  const { zone, soil, temperature, humidity, motor } = req.body;

  // ✅ Validate payload
  if (
    zone === undefined ||
    soil === undefined ||
    temperature === undefined ||
    humidity === undefined ||
    motor === undefined
  ) {
    return res.status(400).json({
      error: "Invalid payload",
      expected: {
        zone: "number",
        soil: "number",
        temperature: "number",
        humidity: "number",
        motor: "boolean"
      }
    });
  }

  // ✅ Store data
  sensorData[zone] = {
    soil,
    temperature,
    humidity,
    motor,
    timestamp: new Date().toISOString()
  };

  console.log("📡 Data received:", sensorData[zone]);

  res.status(200).json({
    status: "success",
    message: "Sensor data received"
  });
});

/* ===== GET: Dashboard fetches data ===== */
app.get("/api/sensor-data", (req, res) => {
  res.json(sensorData);
});

/* Start server */
app.listen(5000, "0.0.0.0", () => {
  console.log("🚀 Backend running on port 5000");
});
