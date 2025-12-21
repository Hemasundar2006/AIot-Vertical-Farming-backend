const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const sensorData = {};

// health check
app.get("/", (req, res) => {
  res.send("Backend running");
});

// POST route (THIS IS CRITICAL)
app.post("/api/sensor-data", (req, res) => {
  const { deviceId, zoneId, soil, temperature, humidity, gas, light } = req.body;

  if (!zoneId) {
    return res.status(400).json({ error: "zoneId missing" });
  }

  sensorData[zoneId] = {
    deviceId,
    soil,
    temperature,
    humidity,
    gas,
    light,
    timestamp: new Date()
  };

  console.log("📥 DATA RECEIVED:", zoneId);

  res.status(200).json({ success: true });
});

// GET route
app.get("/api/sensor-data/:id", (req, res) => {
  res.json(sensorData[req.params.id] || {});
});

app.listen(PORT, () => console.log("Server started"));
