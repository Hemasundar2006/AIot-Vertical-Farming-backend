const express = require("express");
const { 
  register, 
  login, 
  forgotPassword, 
  resetPassword 
} = require("../controllers/authController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: { success: false, message: "Too many login attempts, please try again after a minute" },
});

// Public register route
router.post("/register", register);

// Login route (rate limited)
router.post("/login", loginLimiter, login);

// Password reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
