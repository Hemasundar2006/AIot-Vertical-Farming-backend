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
const SensorData = require('./models/SensorData');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/chatbot', chatbotRoutes); // Alternative route for compatibility
app.use('/api/crop', cropRoutes);
app.use('/api/sensor', sensorRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/stream', streamRoutes);

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

/* ================= RECEIVE ESP32 DATA ================= */
app.post("/temperature", async (req, res) => {
  try {
    const { zone1, zone2, zone3 } = req.body;

    if (!zone1 || !zone2 || !zone3) {
      return res.status(400).json({
        success: false,
        message: "Invalid ESP32 payload"
      });
    }

    // ✅ Store latest data (with motor field also)
    latestData = {
      zones: [
        {
          id: 1,
          soil: zone1.soil,
          temperature: zone1.temp,
          humidity: zone1.hum,
          gas: zone1.gas,
          light: zone1.light,
          motor: zone1.motor || "UNKNOWN"
        },
        {
          id: 2,
          soil: zone2.soil,
          temperature: zone2.temp,
          humidity: zone2.hum,
          gas: zone2.gas,
          light: zone2.light,
          motor: zone2.motor || "UNKNOWN"
        },
        {
          id: 3,
          soil: zone3.soil,
          temperature: zone3.temp,
          humidity: zone3.hum,
          gas: zone3.gas,
          light: zone3.light,
          motor: zone3.motor || "UNKNOWN"
        }
      ],
      timestamp: new Date()
    };

    console.log("📡 Data received from ESP32:");
    console.log(JSON.stringify(latestData, null, 2));

    /* ================= EMAIL ALERT LOGIC ✅ ================= */
    // ✅ Send email when soil moisture reaches 0 (no moisture)
    // Check Zone 1
    if (zone1.soil === 0 && lastSoilState.z1 !== 0) {
      await sendMail(
        `🚨 ZONE 1: No Moisture Detected`,
        `⚠️ ALERT: No moisture in Zone 1 soil!\n\nSoil Moisture: ${zone1.soil}%\nTemperature: ${zone1.temp}°C\nHumidity: ${zone1.hum}%\nGas: ${zone1.gas}\nLight: ${zone1.light}\n\nTime: ${new Date().toLocaleString()}\n\nPlease check the irrigation system for Zone 1.`
      );
      lastSoilState.z1 = 0;
    } else if (zone1.soil > 0 && lastSoilState.z1 === 0) {
      // Reset state when soil moisture is restored
      lastSoilState.z1 = zone1.soil;
    }

    // Check Zone 2
    if (zone2.soil === 0 && lastSoilState.z2 !== 0) {
      await sendMail(
        `🚨 ZONE 2: No Moisture Detected`,
        `⚠️ ALERT: No moisture in Zone 2 soil!\n\nSoil Moisture: ${zone2.soil}%\nTemperature: ${zone2.temp}°C\nHumidity: ${zone2.hum}%\nGas: ${zone2.gas}\nLight: ${zone2.light}\n\nTime: ${new Date().toLocaleString()}\n\nPlease check the irrigation system for Zone 2.`
      );
      lastSoilState.z2 = 0;
    } else if (zone2.soil > 0 && lastSoilState.z2 === 0) {
      // Reset state when soil moisture is restored
      lastSoilState.z2 = zone2.soil;
    }

    // Check Zone 3
    if (zone3.soil === 0 && lastSoilState.z3 !== 0) {
      await sendMail(
        `🚨 ZONE 3: No Moisture Detected`,
        `⚠️ ALERT: No moisture in Zone 3 soil!\n\nSoil Moisture: ${zone3.soil}%\nTemperature: ${zone3.temp}°C\nHumidity: ${zone3.hum}%\nGas: ${zone3.gas}\nLight: ${zone3.light}\n\nTime: ${new Date().toLocaleString()}\n\nPlease check the irrigation system for Zone 3.`
      );
      lastSoilState.z3 = 0;
    } else if (zone3.soil > 0 && lastSoilState.z3 === 0) {
      // Reset state when soil moisture is restored
      lastSoilState.z3 = zone3.soil;
    }

    /* ================= OPTIONAL: Save to MongoDB ✅ ================= */
    // If you want to store every ESP32 data record in DB
    try {
      await SensorData.create({
        zone1,
        zone2,
        zone3,
        timestamp: new Date()
      });
      console.log("✅ Saved sensor data to MongoDB");
    } catch (dbErr) {
      console.log("⚠️ MongoDB save skipped/failed:", dbErr.message);
    }

    res.status(200).json({
      success: true,
      message: "✅ Data stored + soil moisture email checked"
    });

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/* ================= GET ALL ZONES ================= */
app.get("/get_temperature", (req, res) => {
  res.json(latestData);
});

/* ================= GET SINGLE ZONE ================= */
app.get("/zone/:id", (req, res) => {
  const zoneId = parseInt(req.params.id);
  const zone = latestData.zones.find(z => z.id === zoneId);

  if (!zone) {
    return res.status(404).json({ message: "Zone not found" });
  }

  res.json(zone);
});

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

