const express = require('express');
const { getStream, healthz } = require('../controllers/streamController');

const router = express.Router();

// Async wrapper to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/healthz', healthz);
router.get('/get-stream', asyncHandler(getStream));

module.exports = router;

