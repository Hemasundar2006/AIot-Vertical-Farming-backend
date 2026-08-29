const express = require("express");
const { getUserNotifications, markAsRead } = require("../controllers/notificationController");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth); // Must be logged in

router.get("/", getUserNotifications);
router.put("/:id/read", markAsRead);

module.exports = router;
