const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require("nodemailer"); // ✅ ADDED

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const cropRoutes = require('./routes/cropRoutes');
const streamRoutes = require('./routes/streamRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const liveRoutes = require('./routes/liveRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const SensorData = require('./models/SensorData');

// Load cron jobs
require('./jobs/cron');

// Swagger setup
const { swaggerUi, specs } = require('./config/swagger');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/chatbot', chatbotRoutes); // Alternative route for compatibility
app.use('/api/crop', cropRoutes);
app.use('/api/sensor', sensorRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/stream', streamRoutes);

// API Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/* ================= HEALTH CHECK ================= */
app.get("/", (req, res) => {
  res.send("✅ AIoT Vertical Farming Backend Running");
});

/* ================= STORAGE ================= */
let latestData = {
  zones: [],
  timestamp: null
};

/* ================= EMAIL SETUP ✅ ================= */
const emailUser = process.env.EMAIL_USER?.trim();
const emailPass = process.env.EMAIL_PASS?.trim();
const alertTo = process.env.ALERT_TO?.trim();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass
  },
  // Increase timeouts – cloud hosts (e.g. Render) often block SMTP; Gmail may still timeout
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000
});

// Retry sending email (helps with transient timeouts)
const sendMail = async (subject, text, retries = 2) => {
  try {
    if (!emailUser || !emailPass || !alertTo) {
      console.log("⚠️ Email ENV vars missing. Skipping email");
      return;
    }

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        await transporter.sendMail({
          from: emailUser,
          to: alertTo,
          subject,
          text
        });
        console.log("✅ Email sent:", subject);
        return;
      } catch (sendErr) {
        const isTimeout = sendErr.code === "ETIMEDOUT" || sendErr.code === "ESOCKET";
        if (isTimeout && attempt <= retries) {
          console.log(`⚠️ Email attempt ${attempt} timed out, retrying in 3s...`);
          await new Promise((r) => setTimeout(r, 3000));
        } else {
          throw sendErr;
        }
      }
    }
  } catch (err) {
    console.error("❌ Email error:", err.message, "Code:", err.code);
    if (err.code === "ETIMEDOUT" || err.code === "ESOCKET") {
      console.error("   → Gmail SMTP is often blocked on Render/cloud. Use Resend/SendGrid (HTTP API) instead.");
    }
  }
};

/* ================= SOIL MOISTURE STATE TRACK (Spam Avoid) ✅ ================= */
let lastSoilState = { z1: null, z2: null, z3: null };

/* ================= HELPER: FETCH LATEST SENSOR DATA ================= */
const getLatestSensorData = async () => {
  if (latestData.zones && latestData.zones.length > 0) {
    return latestData;
  }

  try {
    const zoneKeys = [
      { key: "zone1", id: 1 },
      { key: "zone2", id: 2 },
      { key: "zone3", id: 3 }
    ];

    const fetchedZones = [];
    let maxTimestamp = null;

    for (const z of zoneKeys) {
      const doc = await SensorData.findOne({ zone: z.key }).sort({ timestamp: -1 });
      if (doc) {
        fetchedZones.push({
          id: z.id,
          soil: doc.soil,
          temperature: doc.temp,
          humidity: doc.hum,
          gas: doc.gas,
          light: doc.light,
          motor: doc.relay === "ON" ? "ON" : "OFF"
        });
        if (!maxTimestamp || (doc.timestamp && doc.timestamp > maxTimestamp)) {
          maxTimestamp = doc.timestamp;
        }
      }
    }

    if (fetchedZones.length > 0) {
      latestData = {
        zones: fetchedZones,
        timestamp: maxTimestamp || new Date()
      };
    }
  } catch (err) {
    console.error("⚠️ Failed to fetch latest data from DB:", err.message);
  }

  return latestData;
};

/* ================= HELPER: PARSE 3 ZONES PAYLOAD ================= */
const parse3ZonesPayload = (body) => {
  if (!body) return [];

  let rawList = [];

  // Case 1: Array payload e.g. [ { id: 1, soil: ... }, { id: 2, ... }, { id: 3, ... } ]
  if (Array.isArray(body)) {
    rawList = body;
  }
  // Case 2: Object containing a 'zones' array e.g. { zones: [...] }
  else if (Array.isArray(body.zones)) {
    rawList = body.zones;
  }
  // Case 3: Keyed object format e.g. { zone1: {...}, zone2: {...}, zone3: {...} }
  // or { z1: {...}, z2: {...}, z3: {...} } or { "1": {...}, "2": {...}, "3": {...} }
  else if (typeof body === 'object') {
    const keysMap = [
      { keys: ['zone1', 'z1', '1'], id: 1, key: 'zone1' },
      { keys: ['zone2', 'z2', '2'], id: 2, key: 'zone2' },
      { keys: ['zone3', 'z3', '3'], id: 3, key: 'zone3' }
    ];

    for (const item of keysMap) {
      for (const k of item.keys) {
        if (body[k] && typeof body[k] === 'object') {
          rawList.push({
            id: item.id,
            zone: item.key,
            ...body[k]
          });
          break;
        }
      }
    }
  }

  // Normalize each zone entry into a clean object with ID 1, 2, 3
  const normalizedZones = [];
  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;

    // Determine numerical ID (1, 2, 3)
    let id = Number(item.id || item.zoneId || (item.zone ? String(item.zone).replace(/\D/g, '') : null));
    if (isNaN(id) || !id) {
      if (item.key === 'zone1' || item.zone === 'zone1') id = 1;
      else if (item.key === 'zone2' || item.zone === 'zone2') id = 2;
      else if (item.key === 'zone3' || item.zone === 'zone3') id = 3;
      else continue;
    }

    const zoneKey = `zone${id}`;
    const soil = Number(item.soil ?? 0);
    const temp = Number(item.temperature ?? item.temp ?? 0);
    const hum = Number(item.humidity ?? item.hum ?? 0);
    const gas = Number(item.gas ?? 0);
    const light = Number(item.light ?? 0);
    const motor = (item.motor || item.relay || "OFF").toString().toUpperCase();

    normalizedZones.push({
      id: id,
      zone: zoneKey,
      soil: soil,
      temp: temp,
      temperature: temp,
      hum: hum,
      humidity: hum,
      gas: gas,
      light: light,
      motor: motor === "ON" ? "ON" : "OFF"
    });
  }

  // Sort by id ascending (1, 2, 3)
  normalizedZones.sort((a, b) => a.id - b.id);
  return normalizedZones;
};

/* ================= 3 ZONES POST HANDLER ================= */
const handle3ZonesPost = async (req, res) => {
  try {
    const zonesList = parse3ZonesPayload(req.body);

    if (zonesList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload: at least one zone (with ID 1, 2, or 3) is required"
      });
    }

    // ✅ Store latest data in memory
    latestData = {
      zones: zonesList.map(z => ({
        id: z.id,
        soil: z.soil,
        temperature: z.temperature,
        humidity: z.humidity,
        gas: z.gas,
        light: z.light,
        motor: z.motor
      })),
      timestamp: new Date()
    };

    console.log("📡 3 Zones Data received:");
    console.log(JSON.stringify(latestData, null, 2));

    /* ================= EMAIL ALERT LOGIC ✅ ================= */
    for (const z of zonesList) {
      const zKey = `z${z.id}`;
      if (z.soil === 0 && lastSoilState[zKey] !== 0) {
        await sendMail(
          `🚨 ZONE ${z.id}: No Moisture Detected`,
          `⚠️ ALERT: No moisture in Zone ${z.id} soil!\n\nSoil Moisture: ${z.soil}%\nTemperature: ${z.temperature}°C\nHumidity: ${z.humidity}%\nGas: ${z.gas}\nLight: ${z.light}\n\nTime: ${new Date().toLocaleString()}\n\nPlease check the irrigation system for Zone ${z.id}.`
        );
        lastSoilState[zKey] = 0;
      } else if (z.soil > 0 && lastSoilState[zKey] === 0) {
        lastSoilState[zKey] = z.soil;
      }
    }

    /* ================= SAVE TO MONGODB ✅ ================= */
    try {
      for (const z of zonesList) {
        await SensorData.create({
          zone: z.zone,
          zoneId: String(z.id),
          soil: z.soil,
          temp: z.temp,
          hum: z.hum,
          gas: z.gas,
          light: z.light,
          relay: z.motor === "ON" ? "ON" : "OFF",
          timestamp: new Date()
        });
      }
      console.log("✅ Saved 3 zones sensor data to MongoDB");
    } catch (dbErr) {
      console.log("⚠️ MongoDB save skipped/failed:", dbErr.message);
    }

    res.status(200).json({
      success: true,
      message: "✅ 3 zones data stored successfully",
      zonesCount: zonesList.length,
      data: latestData
    });

  } catch (error) {
    console.error("❌ Error in 3 zones POST:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* ================= 3 ZONES GET HANDLERS ================= */
const handle3ZonesGet = async (req, res) => {
  const data = await getLatestSensorData();
  res.json({
    success: true,
    data: data
  });
};

const handleSingleZoneGet = async (req, res) => {
  const data = await getLatestSensorData();
  const zoneId = parseInt(req.params.id);
  const zone = data.zones.find(z => z.id === zoneId);

  if (!zone) {
    return res.status(404).json({ success: false, message: `Zone ${zoneId} not found` });
  }

  res.json({
    success: true,
    data: zone
  });
};

/* ================= ZONE CONTROL POST HANDLER ================= */
const handleZoneControlPost = async (req, res) => {
  try {
    const { zoneId, isHighMoisture, turnOn, soil, motor } = req.body;
    const id = Number(zoneId || req.body.id);
    
    if (!id || (id !== 1 && id !== 2 && id !== 3)) {
      return res.status(400).json({ success: false, message: "Invalid zoneId (must be 1, 2, or 3)" });
    }

    let newMoisture = Number(soil);
    let newMotor = motor;

    if (isNaN(newMoisture)) {
      const high = isHighMoisture !== undefined ? isHighMoisture : (turnOn !== undefined ? turnOn : false);
      if (high) {
        newMoisture = Math.floor(Math.random() * (88 - 72 + 1)) + 72; // > 70
        newMotor = "OFF";
      } else {
        newMoisture = Math.floor(Math.random() * (28 - 15 + 1)) + 15; // < 30
        newMotor = "ON";
      }
    }

    // Ensure latestData exists
    if (!latestData || !latestData.zones || latestData.zones.length === 0) {
      latestData = {
        zones: [
          { id: 1, soil: 25, temperature: 25, humidity: 60, gas: 400, light: 800, motor: "ON" },
          { id: 2, soil: 80, temperature: 24, humidity: 55, gas: 380, light: 850, motor: "OFF" },
          { id: 3, soil: 75, temperature: 26, humidity: 58, gas: 410, light: 820, motor: "OFF" }
        ],
        timestamp: new Date()
      };
    }

    const finalMotor = newMotor || (newMoisture > 70 ? "OFF" : "ON");

    // Update target zone in backend memory
    latestData.zones = latestData.zones.map(z => {
      if (z.id === id) {
        return {
          ...z,
          soil: newMoisture,
          motor: finalMotor
        };
      }
      return z;
    });
    latestData.timestamp = new Date();

    // Save to MongoDB if connected
    try {
      await SensorData.create({
        zone: `zone${id}`,
        zoneId: String(id),
        soil: newMoisture,
        temp: 25,
        hum: 60,
        gas: 400,
        light: 800,
        relay: finalMotor,
        timestamp: new Date()
      });
    } catch (dbErr) {
      console.log("MongoDB save skipped:", dbErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Zone ${id} updated: Moisture ${newMoisture}%, Motor ${finalMotor}`,
      data: latestData
    });

  } catch (err) {
    console.error("Error in zone control handler:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= REGISTER 3 ZONES POST ROUTES ================= */
app.post("/3zones", handle3ZonesPost);
app.post("/3zones_data", handle3ZonesPost);
app.post("/api/3zones", handle3ZonesPost);
app.post("/api/zone-control", handleZoneControlPost);
app.post("/zone-control", handleZoneControlPost);
app.post("/temperature", handle3ZonesPost);

/* ================= REGISTER 3 ZONES GET ROUTES ================= */
app.get("/3zones", handle3ZonesGet);
app.get("/3zones_data", handle3ZonesGet);
app.get("/api/3zones", handle3ZonesGet);
app.get("/get_temperature", async (req, res) => {
  const data = await getLatestSensorData();
  res.json(data);
});
app.get("/temperature", handle3ZonesGet);

/* ================= REGISTER SINGLE ZONE GET ROUTES ================= */
app.get("/3zones/:id", handleSingleZoneGet);
app.get("/zone/:id", handleSingleZoneGet);

// Global error handler middleware (must be after all routes)
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  console.error('Error stack:', err.stack);
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);

  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Server error' 
      : message,
    error: process.env.NODE_ENV === 'production' 
      ? 'An error occurred' 
      : err.stack,
    ...(process.env.NODE_ENV !== 'production' && { details: err }),
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vertical_farm';

// MongoDB connection options for Atlas
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.error('Make sure:');
    console.error('1. MongoDB Atlas IP whitelist includes 0.0.0.0/0 (or Render IP)');
    console.error('2. MONGO_URI environment variable is set correctly');
    console.error('3. Connection string includes username, password, and database name');
    return false;
  }
};

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('⚠️  WARNING: JWT_SECRET is not set! Authentication will fail.');
  console.error('Please set JWT_SECRET in your environment variables.');
}

/* ================= START SERVER ================= */
app.listen(PORT, async () => {
  console.log(`🚀 Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Validate environment variables
  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is missing. Set it in Render environment variables.');
  } else {
    console.log('✅ JWT_SECRET is configured');
  }
  
  if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('localhost')) {
    console.warn('⚠️  MONGO_URI appears to be using localhost. Make sure it points to MongoDB Atlas in production.');
  } else {
    console.log('✅ MONGO_URI is configured');
  }
  
  // Attempt to connect to MongoDB
  const connected = await connectDB();
  
  if (!connected) {
    console.warn('Server started but MongoDB not connected. Retrying in 5 seconds...');
    // Retry connection every 5 seconds
    const retryInterval = setInterval(async () => {
      const connected = await connectDB();
      if (connected) {
        clearInterval(retryInterval);
        console.log('✅ MongoDB connection established!');
      }
    }, 5000);
  }
});

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

