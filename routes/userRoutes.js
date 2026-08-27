const express = require("express");
const {
  getSensorData,
  getLatestSensorData,
  downloadMonthlyReport,
  getBills,
  downloadBill,
  getForm16,
  downloadForm16,
} = require("../controllers/userController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

router.use(auth, requireRole("user"));

// Sensor Data
router.get("/sensor-data", getSensorData);
router.get("/sensor-data/latest", getLatestSensorData);
router.get("/sensor-data/download", downloadMonthlyReport);

// Bills
router.get("/bills", getBills);
router.get("/bills/:id/download", downloadBill);

// Form16
router.get("/form16", getForm16);
router.get("/form16/:id/download", downloadForm16);

module.exports = router;
