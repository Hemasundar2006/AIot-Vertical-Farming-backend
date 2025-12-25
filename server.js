const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/chatbot', chatbotRoutes); // Alternative route for compatibility

// Simple health check
app.get('/', (req, res) => {
  res.json({ message: 'AIoT Vertical Farming API is running' });
});

// ===== Unique IDs assigned to each zone =====
const ZONE_IDS = {
  zone1: '6587ab12c3456e7890123451',
  zone2: '6587ab12c3456e7890123452',
  zone3: '6587ab12c3456e7890123453',
};

let farmData = {};

app.post('/temperature', (req, res) => {
  const incoming = req.body;

  // Restructure the data to include IDs inside each zone object
  farmData = {
    zone1: { _id: ZONE_IDS.zone1, ...incoming.zone1 },
    zone2: { _id: ZONE_IDS.zone2, ...incoming.zone2 },
    zone3: { _id: ZONE_IDS.zone3, ...incoming.zone3 },
    last_updated: new Date().toLocaleTimeString(),
  };

  console.log('Updated Data with Object IDs:', JSON.stringify(farmData, null, 2));
  res.status(200).json({ status: 'success' });
});

app.get('/get_temperature', (req, res) => {
  res.json(farmData);
});

// Route to get a specific zone by its numeric ID (1, 2, or 3)
app.get('/api/zone/:id', (req, res) => {
  const zoneKey = `zone${req.params.id}`;
  if (farmData[zoneKey]) {
    res.json(farmData[zoneKey]);
  } else {
    res.status(404).json({ error: 'Zone not found' });
  }
});

// Get everything
app.get('/get_temperature', (req, res) => res.json(farmData));

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
  console.log(`Server running at http://192.168.29.123:${PORT}`);
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

