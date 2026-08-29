const express = require("express");
const {
  getZones,
  getZoneSensorData,
  exportZoneSensorData,
  getOverview,
  uploadBill,
  replaceBill,
  uploadForm16,
  replaceForm16,
  createManagementPerson,
  updateManagementPerson,
  deleteManagementPerson,
  reorderManagementPerson,
  getManagementProfiles,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  createZone,
  updateZone,
  deleteZone,
  getAllBills,
  deleteBill,
  getAllForm16,
  deleteForm16,
  getAllLiveStreams,
  createLiveStream,
  updateLiveStream,
  deleteLiveStream,
  getLoginLogs,
  getAllMonthlyReports,
  getAllNotifications,
  sendNotification,
  getAllProjects,
  uploadProject,
  deleteProject, getAllPlots, createPlot, updatePlot, getAllSettlements, createSettlement
} = require("../controllers/adminController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

// Setup Multer for PDF Uploads (Bills, Form16)
const pdfStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folderName = "misc";
    if (req.originalUrl.includes("/bills")) {
      folderName = `bills/${req.body.userId || "temp"}/${req.body.year}-${req.body.month}`;
    } else if (req.originalUrl.includes("/form16")) {
      folderName = `form16/${req.body.userId || "temp"}/${req.body.financialYear}`;
    }
    return {
      folder: folderName,
      resource_type: "raw", // Needed for PDFs
      format: "pdf",
    };
  },
});

const uploadPdf = multer({
  storage: pdfStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Setup Multer for Image Uploads (Management Photos)
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "management-photos",
    resource_type: "image",
  },
});

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Setup Multer for Video Uploads (Projects)
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "project-videos",
    resource_type: "video",
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for videos
});

// Public Management Route
router.get("/management", getManagementProfiles);

// All routes require admin
router.use(auth, requireRole("admin"));

// Users
router.get("/users", getAllUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Zones Data
router.get("/zones", getZones);
router.post("/zones", createZone);
router.put("/zones/:id", updateZone);
router.delete("/zones/:id", deleteZone);
router.get("/zones/:zoneId/sensor-data", getZoneSensorData);
router.get("/zones/:zoneId/export", exportZoneSensorData);
router.get("/overview", getOverview);

// Bills
router.get("/bills", getAllBills);
router.post("/bills", uploadPdf.single("file"), uploadBill);
router.put("/bills/:id", uploadPdf.single("file"), replaceBill);
router.delete("/bills/:id", deleteBill);

// Form16
router.get("/form16", getAllForm16);
router.post("/form16", uploadPdf.single("file"), uploadForm16);
router.put("/form16/:id", uploadPdf.single("file"), replaceForm16);
router.delete("/form16/:id", deleteForm16);

// Live Streams
router.get("/live-streams", getAllLiveStreams);
router.post("/live-streams", createLiveStream);
router.put("/live-streams/:id", updateLiveStream);
router.delete("/live-streams/:id", deleteLiveStream);

// Auditing & Logs
router.get("/login-logs", getLoginLogs);
router.get("/monthly-reports", getAllMonthlyReports);

// Management
router.post("/management", uploadImage.single("file"), createManagementPerson);
router.put("/management/reorder", reorderManagementPerson);
router.put("/management/:id", uploadImage.single("file"), updateManagementPerson);
router.delete("/management/:id", deleteManagementPerson);

// Notifications
router.get("/notifications", getAllNotifications);
router.post("/notifications", sendNotification);

// Projects
router.get("/projects", getAllProjects);
router.post("/projects", uploadVideo.single("file"), uploadProject);
router.delete("/projects/:id", deleteProject);

// Error handler for Multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message.includes("Only")) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});


// Managed Farmland
router.get("/plots", getAllPlots);
router.post("/plots", createPlot);
router.put("/plots/:id", updatePlot);
router.get("/settlements", getAllSettlements);
router.post("/settlements", createSettlement);

module.exports = router;


