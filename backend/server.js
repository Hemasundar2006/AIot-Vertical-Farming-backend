const express = require("express");
const cors = require("cors");

const app = express();

// Render provides PORT automatically
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ===================== TEMP STORAGE =====================
const sensorData = {
  id1: {},
  id2: {},
  id3: {}
};

// ===================== HEALTH CHECK =====================
app.get("/", (req, res) => {
  res.send("✅ AIoT Vertical Farming Backend Running");
});

// ===================== RECEIVE ESP32 DATA =====================
app.post("/api/sensor-data", (req, res) => {
  try {
    const {
      deviceId,
      zoneId,
      soil,
      temperature,
      humidity,
      gas,
      light
    } = req.body;

    if (!zoneId) {
      return res.status(400).json({ error: "zoneId is required" });
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

    console.log("📥 DATA RECEIVED:", zoneId, sensorData[zoneId]);

    res.status(200).json({
      success: true,
      message: "Data received"
    });

  } catch (error) {
    console.error("❌ ERROR:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ===================== GET DATA BY ZONE =====================
app.get("/api/sensor-data/:id", (req, res) => {
  const id = req.params.id;
  res.json(sensorData[id] || {});
});

// ===================== START SERVER =====================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

