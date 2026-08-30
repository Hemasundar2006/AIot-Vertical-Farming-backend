const express = require('express');
const { chat, healthCheck, createSession, saveMessage } = require('../controllers/chatbotController');

const router = express.Router();

// Async wrapper to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Health check endpoint
router.get('/health', healthCheck);

// Chat endpoint (stateless)
router.post('/', asyncHandler(chat));

// Alternative endpoint for compatibility
router.post('/chat', asyncHandler(chat));

// Session endpoints
router.post('/session', asyncHandler(createSession));
router.post('/session/:sessionId/message', asyncHandler(saveMessage));

module.exports = router;

