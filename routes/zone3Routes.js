const express = require('express');
const {
  receiveData,
  getLatest,
  getAllLatest,
  getHistory,
  getDaily,
  getMonthly,
  getStats,
} = require('../controllers/zone3Controller');

const router = express.Router();

// Wrap async handlers to forward errors to global error handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// POST /api/zone3/data          – receive sensor reading from 2nd ESP32
router.post('/data',      asyncHandler(receiveData));

// GET /api/zone3/latest            – latest Zone 3 reading from DB
router.get('/latest',     asyncHandler(getLatest));

// GET /api/zone3/all-latest        – latest reading for every zone (dashboard)
router.get('/all-latest', asyncHandler(getAllLatest));

// GET /api/zone3/history?limit=50  – last N Zone 3 readings
router.get('/history',    asyncHandler(getHistory));

// GET /api/zone3/daily?date=YYYY-MM-DD
router.get('/daily',      asyncHandler(getDaily));

// GET /api/zone3/monthly?year=YYYY&month=MM
router.get('/monthly',    asyncHandler(getMonthly));

// GET /api/zone3/stats?from=ISO&to=ISO
router.get('/stats',      asyncHandler(getStats));

module.exports = router;
