const express = require('express');
const { register, login } = require('../controllers/authController');
const { checkDBConnection } = require('../middleware/dbMiddleware');

const router = express.Router();

// Async wrapper to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/register', checkDBConnection, asyncHandler(register));
router.post('/login', checkDBConnection, asyncHandler(login));

module.exports = router;


