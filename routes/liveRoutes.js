const express = require('express');
const { setLiveLink, getLiveLink, getAllLiveLinks } = require('../controllers/liveStreamController');
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

// Async wrapper to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Set YouTube live link endpoint
router.post('/set-link', auth, requireRole("admin"), asyncHandler(setLiveLink));

// Get current active live link endpoint
router.get('/get-link', asyncHandler(getLiveLink));

// Get all live stream links (history)
router.get('/all', asyncHandler(getAllLiveLinks));

module.exports = router;

