const Notification = require("../models/Notification");

// Fetch notifications for the logged-in user
exports.getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50); // Fetch latest 50
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error("getUserNotifications Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error("markAsRead Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
