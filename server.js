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

// Middleware
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
app.get('/', (req, res) => {
  res.send("✅ AIoT Vertical Farming Backend is Running");
});

// ===== Unique IDs assigned to each zone =====
const ZONE_IDS = {
  zone1: '6587ab12c3456e7890123451',
  zone2: '6587ab12c3456e7890123452',
  zone3: '6587ab12c3456e7890123453',
};

let latestData = {
  zone1: {},
  zone2: {},
  zone3: {},
  timestamp: null
};

app.post('/temperature', async (req, res) => {
  try {
    const { zone1, zone2, zone3 } = req.body;

    if (!zone1 || !zone2 || !zone3) {
      return res.status(400).json({
        success: false,
        message: "Invalid ESP32 payload"
      });
    }

    latestData = {
      zone1: {
        soil: zone1.soil,
        temp: zone1.temp,
        hum: zone1.hum,
        light: zone1.light,
        gas: zone1.gas,
        motor: zone1.motor
      },
      zone2: {
        soil: zone2.soil,
        temp: zone2.temp,
        hum: zone2.hum,
        light: zone2.light,
        gas: zone2.gas,
        motor: zone2.motor
      },
      zone3: {
        soil: zone3.soil,
        temp: zone3.temp,
        hum: zone3.hum,
        light: zone3.light,
        gas: zone3.gas,
        motor: zone3.motor
      },
      timestamp: new Date()
    };

    console.log("📡 ESP32 DATA RECEIVED:");
    console.log(JSON.stringify(latestData, null, 2));

    // Save to MongoDB for historical data (only if MongoDB is connected)
    if (mongoose.connection.readyState === 1) {
      const savePromises = [];

      // Save data for each zone
      if (zone1) {
        savePromises.push(
          SensorData.create({
            zone: 'zone1',
            zoneId: ZONE_IDS.zone1,
            soil: zone1.soil || 0,
            temp: zone1.temp || 0,
            hum: zone1.hum || 0,
            gas: zone1.gas || 0,
            light: zone1.light || 0,
            relay: zone1.motor || 'OFF',
            timestamp: new Date(),
          })
        );
      }

      if (zone2) {
        savePromises.push(
          SensorData.create({
            zone: 'zone2',
            zoneId: ZONE_IDS.zone2,
            soil: zone2.soil || 0,
            temp: zone2.temp || 0,
            hum: zone2.hum || 0,
            gas: zone2.gas || 0,
            light: zone2.light || 0,
            relay: zone2.motor || 'OFF',
            timestamp: new Date(),
          })
        );
      }

      if (zone3) {
        savePromises.push(
          SensorData.create({
            zone: 'zone3',
            zoneId: ZONE_IDS.zone3,
            soil: zone3.soil || 0,
            temp: zone3.temp || 0,
            hum: zone3.hum || 0,
            gas: zone3.gas || 0,
            light: zone3.light || 0,
            relay: zone3.motor || 'OFF',
            timestamp: new Date(),
          })
        );
      }

      // Save all zones data in parallel (don't wait, fire and forget)
      Promise.all(savePromises).catch((err) => {
        console.error('Error saving sensor data to MongoDB:', err);
      });
    }

    res.status(200).json({
      success: true,
      message: "Sensor data stored successfully"
    });

  } catch (err) {
    console.error("❌ Server Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

/* ================= DASHBOARD GET API ================= */
app.get('/get-data', (req, res) => {
  res.status(200).json(latestData);
});

app.get('/get_temperature', (req, res) => {
  res.status(200).json(latestData);
});

/* ================= ZONE-WISE APIs (OPTIONAL) ================= */
app.get('/zone/:id', (req, res) => {
  const zone = `zone${req.params.id}`;
  if (!latestData[zone]) {
    return res.status(404).json({ message: "Zone not found" });
  }
  res.json(latestData[zone]);
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

// Start server regardless of MongoDB connection status
// This allows the server to start and retry connection
app.listen(PORT, '0.0.0.0', async () => {
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

