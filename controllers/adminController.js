const Zone = require("../models/Zone");
const SensorData = require("../models/SensorData");
const User = require("../models/User");
const Plot = require("../models/Plot");
const Settlement = require("../models/Settlement");
const Bill = require("../models/Bill");
const FormSixteen = require("../models/FormSixteen");
const ManagementPerson = require("../models/ManagementPerson");
const LiveStream = require("../models/LiveStream");
const LoginLog = require("../models/LoginLog");
const MonthlyReport = require("../models/MonthlyReport");
const cloudinary = require("../config/cloudinary");
const { format } = require("fast-csv");
const bcrypt = require("bcryptjs");

exports.getZones = async (req, res) => {
  try {
    const zones = await Zone.find().lean();

    const zonesWithData = await Promise.all(
      zones.map(async (zone) => {
        // Map zone.code to SensorData.zoneId (String)
        const latestSensor = await SensorData.findOne({ zoneId: zone.code }).sort({ timestamp: -1 }).lean();
        return {
          ...zone,
          latestSensorData: latestSensor || null,
        };
      })
    );

    res.status(200).json({ success: true, data: zonesWithData });
  } catch (error) {
    console.error("getZones Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getZoneSensorData = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const zone = await Zone.findById(zoneId);
    if (!zone) {
      return res.status(404).json({ success: false, message: "Zone not found" });
    }

    const query = { zoneId: zone.code };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      SensorData.find(query).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit)),
      SensorData.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getZoneSensorData Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.exportZoneSensorData = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { startDate, endDate } = req.query;

    const zone = await Zone.findById(zoneId);
    if (!zone) {
      return res.status(404).json({ success: false, message: "Zone not found" });
    }

    const query = { zoneId: zone.code };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sensor_data_${zone.code}.csv"`);

    const cursor = SensorData.find(query).sort({ timestamp: -1 }).cursor();
    const csvStream = format({ headers: true });

    csvStream.pipe(res);
    cursor.on('data', (doc) => {
      csvStream.write({
        timestamp: doc.timestamp.toISOString(),
        soil: doc.soil,
        temp: doc.temp,
        hum: doc.hum,
        gas: doc.gas,
        light: doc.light,
        relay: doc.relay,
      });
    }).on('end', () => {
      csvStream.end();
    });

  } catch (error) {
    console.error("exportZoneSensorData Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

exports.getOverview = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalZones, totalUsers, readingsToday] = await Promise.all([
      Zone.countDocuments(),
      User.countDocuments(),
      SensorData.countDocuments({ timestamp: { $gte: today } }),
    ]);

    const zones = await Zone.find();
    const alertZones = [];

    for (const zone of zones) {
      const latest = await SensorData.findOne({ zoneId: zone.code }).sort({ timestamp: -1 });
      if (!latest || latest.timestamp < yesterday) {
        alertZones.push(zone);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        totalZones,
        totalUsers,
        readingsToday,
        alertZones,
      }
    });
  } catch (error) {
    console.error("getOverview Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// --- Bills ---

exports.uploadBill = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "PDF file is required" });
    }
    const { userId, month, year, amount, status } = req.body;

    const newBill = await Bill.create({
      userId, month, year, amount, status,
      cloudinaryUrl: req.file.path,
      cloudinaryPublicId: req.file.filename,
      uploadedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: newBill });
  } catch (error) {
    console.error("uploadBill Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.replaceBill = async (req, res) => {
  try {
    const billId = req.params.id;
    const { status, amount } = req.body;
    
    const bill = await Bill.findById(billId);
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    let updates = { status, amount };

    if (req.file) {
      await cloudinary.uploader.destroy(bill.cloudinaryPublicId, { resource_type: "raw" });
      updates.cloudinaryUrl = req.file.path;
      updates.cloudinaryPublicId = req.file.filename;
    }

    const updatedBill = await Bill.findByIdAndUpdate(billId, updates, { new: true });
    res.status(200).json({ success: true, data: updatedBill });
  } catch (error) {
    console.error("replaceBill Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// --- Form 16 ---

exports.uploadForm16 = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "PDF file is required" });
    }
    const { userId, financialYear } = req.body;

    const newForm16 = await FormSixteen.create({
      userId, financialYear,
      cloudinaryUrl: req.file.path,
      cloudinaryPublicId: req.file.filename,
      uploadedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: newForm16 });
  } catch (error) {
    console.error("uploadForm16 Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.replaceForm16 = async (req, res) => {
  try {
    const formId = req.params.id;
    const { financialYear } = req.body;
    
    const form16 = await FormSixteen.findById(formId);
    if (!form16) {
      return res.status(404).json({ success: false, message: "Form16 not found" });
    }

    let updates = { financialYear };

    if (req.file) {
      await cloudinary.uploader.destroy(form16.cloudinaryPublicId, { resource_type: "raw" });
      updates.cloudinaryUrl = req.file.path;
      updates.cloudinaryPublicId = req.file.filename;
    }

    const updatedForm16 = await FormSixteen.findByIdAndUpdate(formId, updates, { new: true });
    res.status(200).json({ success: true, data: updatedForm16 });
  } catch (error) {
    console.error("replaceForm16 Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// --- Management ---

exports.getManagementProfiles = async (req, res) => {
  try {
    const profiles = await ManagementPerson.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
    res.status(200).json(profiles);
  } catch (error) {
    console.error("getManagementProfiles Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.createManagementPerson = async (req, res) => {
  try {
    const { name, designation, email, phone, collegeName, description, displayOrder, isActive } = req.body;

    let photoUrl = null;
    let photoPublicId = null;

    if (req.file) {
      photoUrl = req.file.path;
      photoPublicId = req.file.filename;
    }

    const person = await ManagementPerson.create({
      name, designation, email, phone, collegeName, description, displayOrder, isActive,
      photoUrl, photoPublicId
    });

    res.status(201).json({ success: true, data: person });
  } catch (error) {
    console.error("createManagementPerson Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.updateManagementPerson = async (req, res) => {
  try {
    const personId = req.params.id;
    const { name, designation, email, phone, collegeName, description, displayOrder, isActive } = req.body;

    const person = await ManagementPerson.findById(personId);
    if (!person) {
      return res.status(404).json({ success: false, message: "Person not found" });
    }

    let updates = { name, designation, email, phone, collegeName, description, displayOrder, isActive };

    if (req.file) {
      if (person.photoPublicId) {
        await cloudinary.uploader.destroy(person.photoPublicId);
      }
      updates.photoUrl = req.file.path;
      updates.photoPublicId = req.file.filename;
    }

    const updatedPerson = await ManagementPerson.findByIdAndUpdate(personId, updates, { new: true });
    res.status(200).json({ success: true, data: updatedPerson });
  } catch (error) {
    console.error("updateManagementPerson Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.deleteManagementPerson = async (req, res) => {
  try {
    const person = await ManagementPerson.findById(req.params.id);
    if (!person) {
      return res.status(404).json({ success: false, message: "Person not found" });
    }

    if (person.photoPublicId) {
      await cloudinary.uploader.destroy(person.photoPublicId);
    }

    await ManagementPerson.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Person deleted successfully" });
  } catch (error) {
    console.error("deleteManagementPerson Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.reorderManagementPerson = async (req, res) => {
  try {
    const { orderings } = req.body; // Array of { id, displayOrder }
    if (!Array.isArray(orderings)) {
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    await Promise.all(
      orderings.map(async (item) => {
        await ManagementPerson.findByIdAndUpdate(item.id, { displayOrder: item.displayOrder });
      })
    );

    res.status(200).json({ success: true, message: "Reordered successfully" });
  } catch (error) {
    console.error("reorderManagementPerson Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// --- Users Management ---

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate("zoneId", "name code").sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("getAllUsers Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, zoneId, phone, isActive } = req.body;
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      zoneId: role === "user" ? zoneId : undefined,
      phone,
      isActive,
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;
    res.status(201).json({ success: true, data: userObj });
  } catch (error) {
    console.error("createUser Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, zoneId, phone, isActive, password } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let updates = { name, email, role, phone, isActive };
    if (role === "user") {
      updates.zoneId = zoneId;
    } else {
      updates.zoneId = null;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.passwordHash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    
    const userObj = updatedUser.toObject();
    delete userObj.passwordHash;
    res.status(200).json({ success: true, data: userObj });
  } catch (error) {
    console.error("updateUser Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("deleteUser Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// --- Zones Management ---

exports.createZone = async (req, res) => {
  try {
    const { name, code, location, isActive } = req.body;
    const existingZone = await Zone.findOne({ code: code.toUpperCase() });
    
    if (existingZone) {
      return res.status(400).json({ success: false, message: "Zone code already exists" });
    }

    const zone = await Zone.create({ name, code, location, isActive });
    res.status(201).json({ success: true, data: zone });
  } catch (error) {
    console.error("createZone Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.updateZone = async (req, res) => {
  try {
    const { name, code, location, isActive } = req.body;
    const zone = await Zone.findByIdAndUpdate(
      req.params.id,
      { name, code, location, isActive },
      { new: true, runValidators: true }
    );
    
    if (!zone) {
      return res.status(404).json({ success: false, message: "Zone not found" });
    }
    res.status(200).json({ success: true, data: zone });
  } catch (error) {
    console.error("updateZone Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.deleteZone = async (req, res) => {
  try {
    const zone = await Zone.findByIdAndDelete(req.params.id);
    if (!zone) {
      return res.status(404).json({ success: false, message: "Zone not found" });
    }
    // Might want to handle users & sensor data associated with this zone later.
    res.status(200).json({ success: true, message: "Zone deleted successfully" });
  } catch (error) {
    console.error("deleteZone Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// --- Bills & Form16 Read/Delete ---

exports.getAllBills = async (req, res) => {
  try {
    const bills = await Bill.find().populate("userId", "name email").sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bills });
  } catch (error) {
    console.error("getAllBills Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }
    
    await cloudinary.uploader.destroy(bill.cloudinaryPublicId, { resource_type: "raw" });
    await Bill.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ success: true, message: "Bill deleted successfully" });
  } catch (error) {
    console.error("deleteBill Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getAllForm16 = async (req, res) => {
  try {
    const form16s = await FormSixteen.find().populate("userId", "name email").sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: form16s });
  } catch (error) {
    console.error("getAllForm16 Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.deleteForm16 = async (req, res) => {
  try {
    const form16 = await FormSixteen.findById(req.params.id);
    if (!form16) {
      return res.status(404).json({ success: false, message: "Form16 not found" });
    }
    
    await cloudinary.uploader.destroy(form16.cloudinaryPublicId, { resource_type: "raw" });
    await FormSixteen.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ success: true, message: "Form16 deleted successfully" });
  } catch (error) {
    console.error("deleteForm16 Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// --- Live Streams ---

exports.getAllLiveStreams = async (req, res) => {
  try {
    const streams = await LiveStream.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: streams });
  } catch (error) {
    console.error("getAllLiveStreams Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.createLiveStream = async (req, res) => {
  try {
    const { streamUrl, title, description, isActive } = req.body;
    const stream = await LiveStream.create({ streamUrl, title, description, isActive });
    res.status(201).json({ success: true, data: stream });
  } catch (error) {
    console.error("createLiveStream Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.updateLiveStream = async (req, res) => {
  try {
    const { streamUrl, title, description, isActive } = req.body;
    const stream = await LiveStream.findByIdAndUpdate(
      req.params.id,
      { streamUrl, title, description, isActive },
      { new: true, runValidators: true }
    );
    if (!stream) {
      return res.status(404).json({ success: false, message: "Stream not found" });
    }
    res.status(200).json({ success: true, data: stream });
  } catch (error) {
    console.error("updateLiveStream Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.deleteLiveStream = async (req, res) => {
  try {
    const stream = await LiveStream.findByIdAndDelete(req.params.id);
    if (!stream) {
      return res.status(404).json({ success: false, message: "Stream not found" });
    }
    res.status(200).json({ success: true, message: "Stream deleted successfully" });
  } catch (error) {
    console.error("deleteLiveStream Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// --- Auditing & Logs ---

exports.getLoginLogs = async (req, res) => {
  try {
    const logs = await LoginLog.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error("getLoginLogs Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getAllMonthlyReports = async (req, res) => {
  try {
    const reports = await MonthlyReport.find().populate("zoneId", "name code").sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    console.error("getAllMonthlyReports Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const Notification = require('../models/Notification');
const Project = require('../models/Project');

// --- Notifications (Admin) ---

exports.getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().populate('userId', 'name email').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error('getAllNotifications Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.sendNotification = async (req, res) => {
  try {
    const { userId, title, message, type } = req.body;
    
    // Note: Instead of email, frontend will provide userId directly from a dropdown
    if (!userId || !title || !message) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newNotification = await Notification.create({
      userId,
      title,
      message,
      type: type || 'info',
      sentByAdmin: req.user._id
    });

    res.status(201).json({ success: true, data: newNotification });
  } catch (error) {
    console.error('sendNotification Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// --- Projects (Admin) ---

exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    console.error('getAllProjects Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.uploadProject = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Video file is required' });
    }
    const { title, description, clientName, isActive } = req.body;

    const newProject = await Project.create({
      title,
      description,
      clientName,
      isActive: isActive === 'true' || isActive === true,
      videoUrl: req.file.path,
      videoPublicId: req.file.filename,
      uploadedBy: req.user._id
    });

    res.status(201).json({ success: true, data: newProject });
  } catch (error) {
    console.error('uploadProject Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Attempt to destroy from Cloudinary
    try {
      await cloudinary.uploader.destroy(project.videoPublicId, { resource_type: 'video' });
    } catch (e) {
      console.warn('Failed to delete video from cloudinary:', e);
    }

    await Project.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('deleteProject Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



exports.getAllPlots = async (req, res) => {
  try {
    const plots = await Plot.find().populate('user', 'name email phone');
    res.status(200).json({ success: true, data: plots });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createPlot = async (req, res) => {
  try {
    const plot = await Plot.create(req.body);
    res.status(201).json({ success: true, data: plot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePlot = async (req, res) => {
  try {
    const plot = await Plot.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plot) return res.status(404).json({ success: false, message: 'Plot not found' });
    res.status(200).json({ success: true, data: plot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllSettlements = async (req, res) => {
  try {
    const settlements = await Settlement.find().populate('user', 'name email').populate('plot', 'plotNumber cropType');
    res.status(200).json({ success: true, data: settlements });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createSettlement = async (req, res) => {
  try {
    const { plotId, userId, yieldKg, marketRate, monthlyServiceFee } = req.body;
    
    const grossRevenue = yieldKg * marketRate;
    const adjustedPool = Math.max(0, grossRevenue - monthlyServiceFee);
    const soilReserve = adjustedPool * 0.10;
    const platformMargin = adjustedPool * 0.10;
    const netPayout = adjustedPool * 0.80;
    
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const statementId = `STM-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

    const settlement = await Settlement.create({
      plot: plotId,
      user: userId,
      statementId,
      totalYieldKg: yieldKg,
      marketRate,
      grossRevenue,
      monthlyServiceFee,
      soilReserve,
      platformMargin,
      netPayout
    });
    
    await Plot.findByIdAndUpdate(plotId, { status: 'Harvested', harvestDate: new Date() });

    res.status(201).json({ success: true, data: settlement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

