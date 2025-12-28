const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const cropRoutes = require('./routes/cropRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
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

/* ================= HEALTH CHECK ================= */
app.get("/", (req, res) => {
  res.send("✅ AIoT Vertical Farming Backend Running");
});

/* ================= STORAGE ================= */
let latestData = {
  zones: [],
  timestamp: null
};

/* ================= RECEIVE ESP32 DATA ================= */
app.post("/temperature", (req, res) => {
  try {
    const { zone1, zone2, zone3 } = req.body;

    if (!zone1 || !zone2 || !zone3) {
      return res.status(400).json({
        success: false,
        message: "Invalid ESP32 payload"
      });
    }

    latestData = {
      zones: [
        {
          id: 1,
          soil: zone1.soil,
          temperature: zone1.temp,
          humidity: zone1.hum,
          gas: zone1.gas,
          light: zone1.light
        },
        {
          id: 2,
          soil: zone2.soil,
          temperature: zone2.temp,
          humidity: zone2.hum,
          gas: zone2.gas,
          light: zone2.light
        },
        {
          id: 3,
          soil: zone3.soil,
          temperature: zone3.temp,
          humidity: zone3.hum,
          gas: zone3.gas,
          light: zone3.light
        }
      ],
      timestamp: new Date()
    };

    console.log("📡 Data received from ESP32:");
    console.log(JSON.stringify(latestData, null, 2));

    res.status(200).json({
      success: true,
      message: "Data stored successfully"
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

