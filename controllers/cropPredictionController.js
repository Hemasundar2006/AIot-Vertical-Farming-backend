/**
 * Crop & Water Prediction Controller
 * Gradio-compatible (STRICT dropdown handling)
 */

const getGradioClient = async () => {
  const gradioClient = require("@gradio/client");
  return gradioClient.Client || gradioClient;
};

/* =========================================================
   CROP PREDICTION
   ========================================================= */

// @desc    Predict crop based on year, season, month, soil type
// @route   POST /api/crop/predict
// @access  Public
exports.predictCrop = async (req, res) => {
  try {
    const { season, month, soil_type } = req.body;

    // Year is FIXED
    const year = 2025;

    if (!season || !month || !soil_type) {
      return res.status(400).json({
        error: "season, month, and soil_type are required",
      });
    }

    const validSeasons = ["Kharif", "Rabi", "Zaid"];
    const validMonths = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const validSoilTypes = ["Clay", "Loam", "Sandy", "Silt"];

    if (!validSeasons.includes(season)) {
      return res.status(400).json({ error: "Invalid season" });
    }
    if (!validMonths.includes(month)) {
      return res.status(400).json({ error: "Invalid month" });
    }
    if (!validSoilTypes.includes(soil_type)) {
      return res.status(400).json({ error: "Invalid soil type" });
    }

    const Client = await getGradioClient();
    const client = await Client.connect("sumiyon/Agrinex");

    const result = await client.predict("/predict_crop", {
      year,
      season,
      month,
      soil_type,
    });

    const prediction = Array.isArray(result.data)
      ? result.data[0]
      : result.data;

    res.status(200).json({
      message: "Crop prediction successful",
      prediction,
      input: { year, season, month, soil_type },
    });
  } catch (err) {
    console.error("Crop prediction error:", err);
    res.status(500).json({
      error: err.message || "Crop prediction failed",
    });
  }
};

/* =========================================================
   WATER PREDICTION (FIXED YEAR ISSUE)
   ========================================================= */

// Internal helper
const processWaterPrediction = async (crop, soil, month, season, temperature) => {
  if (!crop || !soil || !month || !season || temperature === undefined) {
    throw { status: 400, error: "Missing required fields" };
  }

  // 🔒 YEAR MUST MATCH GRADIO DROPDOWN EXACTLY
  const year = "2025";

  const validCrops = [
    "Lettuce",
    "Microgreens",
    "Tomato",
    "Strawberry",
    "Pepper/Chili",
    "Eggplant",
    "Onion",
  ];

  const validSoils = ["Clay", "Sandy", "Loamy"];
  const validSeasons = ["Summer", "Monsoon", "Winter"];
  const validMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const validTemps = [18, 20, 22, 25, 28, 30, 32, 35];

  if (!validCrops.includes(crop)) throw { status: 400, error: "Invalid crop" };
  if (!validSoils.includes(soil)) throw { status: 400, error: "Invalid soil" };
  if (!validSeasons.includes(season)) throw { status: 400, error: "Invalid season" };
  if (!validMonths.includes(month)) throw { status: 400, error: "Invalid month" };

  const temp = Number(temperature);
  if (!validTemps.includes(temp)) {
    throw {
      status: 400,
      error: `Temperature must be one of ${validTemps.join(", ")}`,
    };
  }

  const Client = await getGradioClient();
  const client = await Client.connect("sumiyon/water_only");

  // Inspect API to understand parameter structure
  try {
    const apiInfo = await client.view_api();
    console.log("Gradio API Info:", JSON.stringify(apiInfo, null, 2));
  } catch (apiErr) {
    console.log("Could not fetch API info:", apiErr.message);
  }

  // Try different approaches for year parameter due to Gradio dropdown issue
  // Strategy: Try without year first, then with different formats
  let result;
  let lastError = null;

  // Try 1: Without year parameter (if it's optional with single choice)
  try {
    result = await client.predict("/predict_water", {
      crop,
      soil,
      month,
      season,
      temperature: temp,
      // year omitted
    });
    console.log("Success: Year parameter omitted");
  } catch (err1) {
    lastError = err1;
    console.log("Failed without year, trying with year as string...");

    // Try 2: With year as string "2025"
    try {
      result = await client.predict("/predict_water", {
        crop,
        soil,
        month,
        season,
        year: "2025",
        temperature: temp,
      });
      console.log("Success: Year as string '2025'");
    } catch (err2) {
      lastError = err2;
      console.log("Failed with string, trying with year as number...");

      // Try 3: With year as number 2025
      try {
        result = await client.predict("/predict_water", {
          crop,
          soil,
          month,
          season,
          year: 2025,
          temperature: temp,
        });
        console.log("Success: Year as number 2025");
      } catch (err3) {
        lastError = err3;
        console.log("Failed with number, trying with year as index 0...");

        // Try 4: With year as index 0
        try {
          result = await client.predict("/predict_water", {
            crop,
            soil,
            month,
            season,
            year: 0,
            temperature: temp,
          });
          console.log("Success: Year as index 0");
        } catch (err4) {
          lastError = err4;
          throw lastError || new Error("All year format attempts failed");
        }
      }
    }
  }

  const prediction = Array.isArray(result.data)
    ? result.data[0]
    : result.data;

  return {
    prediction,
    input: { crop, soil, month, season, year, temperature: temp },
  };
};

// @desc    Predict water (POST)
// @route   POST /api/crop/predict-water
exports.predictWater = async (req, res) => {
  try {
    const { crop, soil, month, season, temperature } = req.body;

    const result = await processWaterPrediction(
      crop,
      soil,
      month,
      season,
      temperature
    );

    res.status(200).json({
      prediction: `💧 Water Required: ${result.prediction} Liters / Month`,
    });
  } catch (err) {
    console.error("Water prediction error:", err);
    res.status(err.status || 500).json({
      error: err.error || err.message || "Water prediction failed",
    });
  }
};

// @desc    Predict water (GET)
// @route   GET /api/crop/predict-water
exports.predictWaterGet = async (req, res) => {
  try {
    const { crop, soil, month, season, temperature } = req.query;

    const result = await processWaterPrediction(
      crop,
      soil,
      month,
      season,
      temperature
    );

    res.status(200).json(result);
  } catch (err) {
    console.error("Water prediction GET error:", err);
    res.status(err.status || 500).json({
      error: err.error || err.message,
    });
  }
};

/* =========================================================
   OPTIONS API
   ========================================================= */

exports.getOptions = (req, res) => {
  res.status(200).json({
    waterPrediction: {
      crops: [
        "Lettuce",
        "Microgreens",
        "Tomato",
        "Strawberry",
        "Pepper/Chili",
        "Eggplant",
        "Onion",
      ],
      seasons: ["Summer", "Monsoon", "Winter"],
      months: [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ],
      soilTypes: ["Clay", "Sandy", "Loamy"],
      temperatures: [18, 20, 22, 25, 28, 30, 32, 35],
      years: ["2025"], // 🔒 FIXED
    },
  });
};
