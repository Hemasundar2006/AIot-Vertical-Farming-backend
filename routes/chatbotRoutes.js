const express = require('express');
const { chat, healthCheck, getStatus, createSession, saveMessage } = require('../controllers/chatbotController');

const router = express.Router();

// Async wrapper to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Health check endpoint
router.get('/health', healthCheck);

// Live database status snapshot endpoint
router.get('/status', asyncHandler(getStatus));

// Chat / Question endpoints (all support both body.message and body.question)
router.post('/', asyncHandler(chat));
router.post('/chat', asyncHandler(chat));
router.post('/ask', asyncHandler(chat));

// Session endpoints
router.post('/session', asyncHandler(createSession));
router.post('/session/:sessionId/message', asyncHandler(saveMessage));

module.exports = router;


