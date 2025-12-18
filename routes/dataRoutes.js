const express = require('express');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @desc    Receive sensor data (moisture, temp, humidity)
// @route   POST /api/data/update
// @access  Private (JWT protected)
router.post('/update', protect, async (req, res) => {
  try {
    const { moisture, temp, humidity } = req.body;

    if (
      moisture === undefined ||
      temp === undefined ||
      humidity === undefined
    ) {
      return res
        .status(400)
        .json({ message: 'moisture, temp, and humidity are required' });
    }

    // In a real system you would save this to a SensorData model or send to a queue
    // Here we just echo it back to show protected access works
    res.status(201).json({
      message: 'Sensor data received',
      data: { moisture, temp, humidity },
      receivedBy: {
        id: req.user.id,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error('Data update error:', error);
    res.status(500).json({ message: 'Server error while updating data' });
  }
});

module.exports = router;


