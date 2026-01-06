const express = require('express');
const { predictCrop, predictWater, predictWaterGet, getOptions } = require('../controllers/cropPredictionController');

const router = express.Router();

// Async wrapper to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get available options for prediction
router.get('/options', getOptions);

// Predict crop endpoint
router.post('/predict', asyncHandler(predictCrop));

// Predict water requirements endpoint (POST)
router.post('/predict-water', asyncHandler(predictWater));

// Predict water requirements endpoint (GET)
router.get('/predict-water', asyncHandler(predictWaterGet));

module.exports = router;



