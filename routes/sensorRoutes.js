const express = require('express');
const {
  getDailyData,
  getMonthlyData,
  getAllZonesDailyData,
  getAllZonesMonthlyData,
} = require('../controllers/sensorDataController');

const router = express.Router();

// Async wrapper to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get daily data for all zones
router.get('/daily', asyncHandler(getAllZonesDailyData));

// Get daily data for a specific zone
router.get('/daily/:zone', asyncHandler(getDailyData));

// Get monthly data for all zones
router.get('/monthly', asyncHandler(getAllZonesMonthlyData));

// Get monthly data for a specific zone
router.get('/monthly/:zone', asyncHandler(getMonthlyData));

module.exports = router;

