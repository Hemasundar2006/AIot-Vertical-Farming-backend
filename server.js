const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'AIoT Vertical Farming API is running' });
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
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
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


