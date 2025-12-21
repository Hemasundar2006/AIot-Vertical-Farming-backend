const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= STORAGE ================= */
let sensorData = {
  1: null,
  2: null,
  3: null
};

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.json({ message: "AIoT Vertical Farming API is running" });
});

/* ================= POST (NO SLASH) ================= */
app.post("/api/sensor-data", handleSensorData);

/* ================= POST (WITH SLASH) ================= */
app.post("/api/sensor-data/", handleSensorData);

/* ================= GET (NO SLASH) ================= */
app.get("/api/sensor-data", (req, res) => {
  res.json(sensorData);
});

/* ================= GET (WITH SLASH) ================= */
app.get("/api/sensor-data/", (req, res) => {
  res.json(sensorData);
});

/* ================= HANDLER ================= */
function handleSensorData(req, res) {
  const {
    zone,
    soil,
    temperature,
    humidity,
    gas,
    light,
    motor
  } = req.body;

  if (!zone) {
    return res.status(400).json({ error: "zone is required" });
  }

  sensorData[zone] = {
    soil,
    temperature,
    humidity,
    gas,
    light,
    motor,
    time: new Date().toISOString()
  };

  console.log("📡 Data received from zone", zone);
  res.status(200).json({ status: "received" });
}

/* ================= START ================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
