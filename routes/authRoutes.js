const express = require('express');
const { register, login } = require('../controllers/authController');
const { checkDBConnection } = require('../middleware/dbMiddleware');

const router = express.Router();

router.post('/register', checkDBConnection, register);
router.post('/login', checkDBConnection, login);

module.exports = router;


