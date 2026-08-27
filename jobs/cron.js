const cron = require("node-cron");
const axios = require("axios");
const cloudinary = require("../config/cloudinary");
const Zone = require("../models/Zone");
const SensorData = require("../models/SensorData");
const MonthlyReport = require("../models/MonthlyReport");

// Run on the 1st of each month at 02:00 AM
cron.schedule("0 2 1 * *", async () => {
  console.log("Running monthly PDF report generation cron job...");
  
  try {
    const now = new Date();
    let month = now.getMonth(); // 0-11
    let year = now.getFullYear();
    if (month === 0) {
      month = 12;
      year -= 1;
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const zones = await Zone.find({ isActive: true });
    
    for (const zone of zones) {
      try {
        const sensorData = await SensorData.find({
          zoneId: zone.code,
          timestamp: { $gte: startDate, $lte: endDate }
        }).sort({ timestamp: 1 }).lean();

        if (sensorData.length === 0) {
          console.log(`No data for zone ${zone.code} in month ${month}/${year}`);
          continue;
        }

        const pythonPayload = {
          zoneId: zone.code,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          sensorData,
          format: "pdf"
        };

        const pythonServiceUrl = process.env.PDF_SERVICE_URL || "http://localhost:8000";
        const response = await axios.post(`${pythonServiceUrl}/generate-report`, pythonPayload, {
          responseType: "arraybuffer",
        });

        const buffer = Buffer.from(response.data, 'binary');
        
        await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: "raw",
              folder: `sensor-reports/${zone._id}/${year}-${month}`,
              format: "pdf",
            },
            async (error, result) => {
              if (error) return reject(error);
              
              await MonthlyReport.findOneAndUpdate(
                { zoneId: zone._id, month, year },
                {
                  cloudinaryUrl: result.secure_url,
                  cloudinaryPublicId: result.public_id,
                },
                { upsert: true, new: true }
              );
              resolve();
            }
          ).end(buffer);
        });

        console.log(`Successfully generated report for zone ${zone.code} for ${month}/${year}`);
      } catch (err) {
        console.error(`Error generating report for zone ${zone.code}:`, err);
      }
    }
  } catch (error) {
    console.error("Cron job error:", error);
  }
});
