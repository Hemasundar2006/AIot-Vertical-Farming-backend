const mongoose = require('mongoose');

// Middleware to check if MongoDB is connected
exports.checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database connection not available',
      error: 'Please try again in a few moments. The server is connecting to the database.',
    });
  }
  next();
};

