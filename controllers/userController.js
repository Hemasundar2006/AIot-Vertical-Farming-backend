const Zone = require("../models/Zone");
const SensorData = require("../models/SensorData");
const Bill = require("../models/Bill");
const FormSixteen = require("../models/FormSixteen");
const MonthlyReport = require("../models/MonthlyReport");
const cloudinary = require("../config/cloudinary");

// Helper function to get Cloudinary signed URL
const getSignedUrl = (publicId) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, public_id: publicId },
    process.env.CLOUDINARY_API_SECRET
  );
  
  return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/s--${signature}--/${publicId}`;
};

exports.getSensorData = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const zone = await Zone.findById(req.user.zoneId);
    if (!zone) {
      return res.status(404).json({ success: false, message: "Assigned zone not found" });
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
    console.error("getSensorData Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getLatestSensorData = async (req, res) => {
  try {
    const zone = await Zone.findById(req.user.zoneId);
    if (!zone) {
      return res.status(404).json({ success: false, message: "Assigned zone not found" });
    }

    const latest = await SensorData.findOne({ zoneId: zone.code }).sort({ timestamp: -1 });
    res.status(200).json({ success: true, data: latest });
  } catch (error) {
    console.error("getLatestSensorData Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.downloadMonthlyReport = async (req, res) => {
  try {
    const zone = await Zone.findById(req.user.zoneId);
    if (!zone) {
      return res.status(404).json({ success: false, message: "Assigned zone not found" });
    }

    // Determine previous calendar month
    const now = new Date();
    let month = now.getMonth(); // 0-11. (Month 0 is Jan)
    let year = now.getFullYear();
    if (month === 0) {
      month = 12;
      year = year - 1;
    }

    // Check cache
    const cachedReport = await MonthlyReport.findOne({ zoneId: req.user.zoneId, month, year });
    if (cachedReport) {
      return res.redirect(getSignedUrl(cachedReport.cloudinaryPublicId));
    }

    // Generate on demand if not cached (Python microservice)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const sensorData = await SensorData.find({
      zoneId: zone.code,
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: 1 }).lean();

    if (sensorData.length === 0) {
      return res.status(404).json({ success: false, message: "No data found for the previous month" });
    }

    // Fetch PDF from python service
    const axios = require("axios"); // need to require here or globally
    const FormData = require("form-data");
    
    // We send JSON to python service
    const pythonPayload = {
      zoneId: zone.code,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      sensorData,
      format: "pdf"
    };

    const pythonServiceUrl = process.env.PDF_SERVICE_URL || "http://localhost:8000";
    const response = await axios.post(`${pythonServiceUrl}/generate-report`, pythonPayload, {
      responseType: "arraybuffer", // For streaming back PDF
    });

    // Upload to Cloudinary
    const buffer = Buffer.from(response.data, 'binary');
    
    cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: `sensor-reports/${zone._id}/${year}-${month}`,
        format: "pdf",
      },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Error:", error);
          return res.status(500).json({ success: false, message: "Failed to upload generated PDF" });
        }

        // Cache the result
        await MonthlyReport.create({
          zoneId: zone._id,
          month,
          year,
          cloudinaryUrl: result.secure_url,
          cloudinaryPublicId: result.public_id,
        });

        // Redirect to newly uploaded file
        res.redirect(getSignedUrl(result.public_id));
      }
    ).end(buffer);

  } catch (error) {
    console.error("downloadMonthlyReport Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getBills = async (req, res) => {
  try {
    const bills = await Bill.find({ userId: req.user._id }).sort({ year: -1, month: -1 }).lean();
    res.status(200).json({ success: true, data: bills });
  } catch (error) {
    console.error("getBills Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.downloadBill = async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user._id });
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found or unauthorized" });
    }

    res.redirect(getSignedUrl(bill.cloudinaryPublicId));
  } catch (error) {
    console.error("downloadBill Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getForm16 = async (req, res) => {
  try {
    const form16s = await FormSixteen.find({ userId: req.user._id }).sort({ financialYear: -1 }).lean();
    res.status(200).json({ success: true, data: form16s });
  } catch (error) {
    console.error("getForm16 Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.downloadForm16 = async (req, res) => {
  try {
    const form16 = await FormSixteen.findOne({ _id: req.params.id, userId: req.user._id });
    if (!form16) {
      return res.status(404).json({ success: false, message: "Form16 not found or unauthorized" });
    }

    res.redirect(getSignedUrl(form16.cloudinaryPublicId));
  } catch (error) {
    console.error("downloadForm16 Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
