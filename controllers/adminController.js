const Zone = require("../models/Zone");
const SensorData = require("../models/SensorData");
const User = require("../models/User");
const Bill = require("../models/Bill");
const FormSixteen = require("../models/FormSixteen");
const ManagementPerson = require("../models/ManagementPerson");
const cloudinary = require("../config/cloudinary");
const { format } = require("fast-csv");

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
    const { name, designation, email, phone, description, displayOrder, isActive } = req.body;

    let photoUrl = null;
    let photoPublicId = null;

    if (req.file) {
      photoUrl = req.file.path;
      photoPublicId = req.file.filename;
    }

    const person = await ManagementPerson.create({
      name, designation, email, phone, description, displayOrder, isActive,
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
    const { name, designation, email, phone, description, displayOrder, isActive } = req.body;

    const person = await ManagementPerson.findById(personId);
    if (!person) {
      return res.status(404).json({ success: false, message: "Person not found" });
    }

    let updates = { name, designation, email, phone, description, displayOrder, isActive };

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
