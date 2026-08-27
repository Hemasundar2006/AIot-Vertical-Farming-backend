const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { z } = require("zod");
const User = require("../models/User");
const LoginLog = require("../models/LoginLog");

// Zod schemas for validation
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "user"]),
  zoneId: z.string().optional(),
  phone: z.string().optional(),
}).refine(data => {
  if (data.role === "user" && !data.zoneId) {
    return false;
  }
  return true;
}, { message: "zoneId is required for users", path: ["zoneId"] });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

// Helper to log login attempts
const logLoginAttempt = async (email, role, success, req) => {
  try {
    await LoginLog.create({
      email,
      role,
      success,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (error) {
    console.error("Failed to log login attempt:", error);
  }
};

exports.register = async (req, res) => {
  try {
    const parsedData = registerSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({ success: false, errors: parsedData.error.format() });
    }

    const { name, email, password, role, zoneId, phone } = parsedData.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email already in use" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role,
      zoneId: role === "user" ? zoneId : undefined,
      phone,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        zoneId: newUser.zoneId,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  let foundRole = null;
  const email = req.body.email;
  try {
    const parsedData = loginSchema.safeParse(req.body);
    if (!parsedData.success) {
      await logLoginAttempt(email || "unknown", null, false, req);
      return res.status(400).json({ success: false, errors: parsedData.error.format() });
    }

    const { password } = parsedData.data;

    const user = await User.findOne({ email: parsedData.data.email });
    if (!user) {
      await logLoginAttempt(email, null, false, req);
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    foundRole = user.role;

    if (!user.isActive) {
      await logLoginAttempt(email, foundRole, false, req);
      return res.status(403).json({ success: false, message: "Account disabled" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await logLoginAttempt(email, foundRole, false, req);
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, zoneId: user.zoneId },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    await logLoginAttempt(email, foundRole, true, req);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        zoneId: user.zoneId,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    await logLoginAttempt(email || "unknown", foundRole, false, req);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const parsedData = forgotPasswordSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({ success: false, errors: parsedData.error.format() });
    }

    const { email } = parsedData.data;
    const user = await User.findOne({ email });

    if (!user) {
      // Return success anyway to prevent email enumeration
      return res.status(200).json({ success: true, message: "If that email is registered, a reset link was sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    // In a real app, send an email here with `resetToken`
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.status(200).json({ success: true, message: "If that email is registered, a reset link was sent." });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const parsedData = resetPasswordSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({ success: false, errors: parsedData.error.format() });
    }

    const { token, newPassword } = parsedData.data;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
