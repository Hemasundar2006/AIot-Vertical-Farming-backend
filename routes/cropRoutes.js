const express = require('express');
const { predictCrop, getOptions } = require('../controllers/cropPredictionController');

const router = express.Router();

// Async wrapper to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get available options for prediction
router.get('/options', getOptions);

// Predict crop endpoint
router.post('/predict', asyncHandler(predictCrop));

module.exports = router;



