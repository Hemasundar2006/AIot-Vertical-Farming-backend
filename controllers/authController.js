const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

// Helper to generate JWT
const generateToken = (userId, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    {
      id: userId,
      role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected. State:', mongoose.connection.readyState);
      return res.status(503).json({
        message: 'Database connection not available',
        error: 'Please try again in a few moments. The server is connecting to the database.',
      });
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return res.status(500).json({
        message: 'Server configuration error',
        error: 'JWT_SECRET is not set. Please configure it in environment variables.',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User with that email already exists' });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password, // will be hashed by pre-save hook
      role: role || 'Farmer',
    });

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    
    // Provide more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Server error during registration'
      : error.message || 'Server error during registration';
    
    // Check for specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        error: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({ message: 'User with that email already exists' });
    }
    
    if (error.message && error.message.includes('JWT_SECRET')) {
      return res.status(500).json({ 
        message: 'Server configuration error: JWT_SECRET not set',
        error: errorMessage 
      });
    }

    // Check for MongoDB connection errors
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      return res.status(503).json({
        message: 'Database error',
        error: 'Unable to connect to database. Please try again later.',
      });
    }
    
    res.status(500).json({ 
      message: 'Server error during registration',
      error: errorMessage 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Server error during login'
      : error.message || 'Server error during login';
    
    if (error.message.includes('JWT_SECRET')) {
      return res.status(500).json({ 
        message: 'Server configuration error: JWT_SECRET not set',
        error: errorMessage 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error during login',
      error: errorMessage 
    });
  }
};


