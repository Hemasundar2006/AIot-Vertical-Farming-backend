// @desc    Predict crop based on year, season, month, and soil type
// @route   POST /api/crop/predict
// @access  Public

exports.predictCrop = async (req, res) => {
  try {
    const { year, season, month, soil_type } = req.body;

    // Validate required fields
    if (!year || !season || !month || !soil_type) {
      return res.status(400).json({
        message: 'Missing required fields',
        error: 'year, season, month, and soil_type are required',
      });
    }

    // Validate year
    if (typeof year !== 'number' || year < 2000 || year > 2100) {
      return res.status(400).json({
        message: 'Invalid year',
        error: 'Year must be a number between 2000 and 2100',
      });
    }

    // Validate season
    const validSeasons = ['Kharif', 'Rabi', 'Zaid'];
    if (!validSeasons.includes(season)) {
      return res.status(400).json({
        message: 'Invalid season',
        error: `Season must be one of: ${validSeasons.join(', ')}`,
      });
    }

    // Validate month
    const validMonths = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    if (!validMonths.includes(month)) {
      return res.status(400).json({
        message: 'Invalid month',
        error: `Month must be one of: ${validMonths.join(', ')}`,
      });
    }

    // Validate soil type
    const validSoilTypes = ['Clay', 'Loam', 'Sandy', 'Silt'];
    if (!validSoilTypes.includes(soil_type)) {
      return res.status(400).json({
        message: 'Invalid soil type',
        error: `Soil type must be one of: ${validSoilTypes.join(', ')}`,
      });
    }

    // Import Gradio client
    let Client;
    try {
      const gradioClient = require('@gradio/client');
      // Handle both named export { Client } and default export
      Client = gradioClient.Client || gradioClient;
    } catch (error) {
      console.error('Failed to load @gradio/client:', error);
      return res.status(500).json({
        message: 'Crop prediction service not available',
        error: '@gradio/client package is not installed. Please install it: npm install @gradio/client',
      });
    }

    // Connect to Gradio API (sumiyon/Agrinex space)
    const client = await Client.connect('sumiyon/Agrinex');

    // Make prediction
    const result = await client.predict('/predict_crop', {
      year: year,
      season: season,
      month: month,
      soil_type: soil_type,
    });

    // Extract the predicted crop from result
    // Gradio returns data in result.data array, first element is the prediction
    const predictedCrop = Array.isArray(result.data) ? result.data[0] : result.data;

    res.status(200).json({
      message: 'Crop prediction generated successfully',
      prediction: predictedCrop,
      input: {
        year,
        season,
        month,
        soil_type,
      },
    });
  } catch (error) {
    console.error('Crop prediction error:', error);
    console.error('Error stack:', error.stack);

    // Handle specific Gradio API errors
    if (error.message && error.message.includes('connect')) {
      return res.status(503).json({
        message: 'Crop prediction service unavailable',
        error: 'Unable to connect to prediction service. Please try again later.',
      });
    }

    res.status(500).json({
      message: 'Server error during crop prediction',
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while processing your request'
        : error.message,
    });
  }
};

// Helper function to process water prediction (shared by POST and GET)
// Year is hardcoded to 2025 - no user input required
const processWaterPrediction = async (crop, soil, month, season, temperature) => {
  // Validate required fields (year is not required as it's hardcoded)
  if (!crop || !soil || !month || !season || temperature === undefined) {
    throw { status: 400, message: 'Missing required fields', error: 'crop, soil, month, season, and temperature are required' };
  }
  
  // Hardcode year to 2025
  const year = "2025";

  // Validate crop
  const validCrops = [
    'Lettuce',
    'Microgreens',
    'Tomato',
    'Strawberry',
    'Pepper/Chili',
    'Eggplant',
    'Onion'
  ];
  if (!validCrops.includes(crop)) {
    throw { status: 400, message: 'Invalid crop', error: `Crop must be one of: ${validCrops.join(', ')}` };
  }

  // Validate month
  const validMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  if (!validMonths.includes(month)) {
    throw { status: 400, message: 'Invalid month', error: `Month must be one of: ${validMonths.join(', ')}` };
  }

  // Validate season
  const validSeasons = ['Summer', 'Monsoon', 'Winter'];
  if (!validSeasons.includes(season)) {
    throw { status: 400, message: 'Invalid season', error: `Season must be one of: ${validSeasons.join(', ')}` };
  }

  // Validate soil type
  const validSoilTypes = ['Clay', 'Sandy', 'Loamy'];
  if (!validSoilTypes.includes(soil)) {
    throw { status: 400, message: 'Invalid soil type', error: `Soil type must be one of: ${validSoilTypes.join(', ')}` };
  }

  // Validate temperature - only specific values allowed
  const validTemperatures = [18, 20, 22, 25, 28, 30, 32, 35];
  const tempNum = typeof temperature === 'string' ? parseFloat(temperature) : temperature;
  if (isNaN(tempNum) || !validTemperatures.includes(tempNum)) {
    throw { status: 400, message: 'Invalid temperature', error: `Temperature must be one of: ${validTemperatures.join(', ')}` };
  }

  // Year is hardcoded to "2025" as string (Gradio API is strict about types)
  const yearStr = "2025";

  // Import Gradio client
  let Client;
  try {
    const gradioClient = require('@gradio/client');
    Client = gradioClient.Client || gradioClient;
  } catch (error) {
    console.error('Failed to load @gradio/client:', error);
    throw { status: 500, message: 'Water prediction service not available', error: '@gradio/client package is not installed. Please install it: npm install @gradio/client' };
  }

  // Connect to Gradio API (sumiyon/water_only space)
  const client = await Client.connect('sumiyon/water_only');

  // Make prediction - API expects all parameters as strings
  // Year is always "2025"
  const predictionParams = {
    crop: String(crop),
    soil: String(soil),
    month: String(month),
    season: String(season),
    year: "2025", // Hardcoded to 2025
    temperature: String(temperature),
  };

  console.log('Sending prediction params:', predictionParams);

  // IMPORTANT: The endpoint name must match the Gradio function name.
  // The correct endpoint for the sumiyon/water_only space is `/predict_water`.
  const result = await client.predict('/predict_water', predictionParams);

  // Extract the prediction result
  const waterPrediction = Array.isArray(result.data) ? result.data[0] : result.data;

  return {
    prediction: waterPrediction,
    input: {
      crop,
      soil,
      month,
      season,
      year: "2025", // Always 2025
      temperature: temperature.toString(),
    },
  };
};

// @desc    Predict water requirements based on crop, soil, month, season, and temperature (POST)
// @route   POST /api/crop/predict-water
// @access  Public
// Note: Year is hardcoded to 2025
exports.predictWater = async (req, res) => {
  try {
    const { crop, soil, month, season, temperature } = req.body;
    const result = await processWaterPrediction(crop, soil, month, season, temperature);
    
    res.status(200).json({
      message: 'Water prediction generated successfully',
      ...result,
    });
  } catch (error) {
    // Handle validation errors
    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
        error: error.error,
      });
    }

    console.error('Water prediction error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error type:', error.type);
    console.error('Error message:', error.message);

    // Handle Gradio API specific errors
    if (error.type === 'status' || error.success === false) {
      const errorMsg = error.message || 'Prediction service returned an error';
      return res.status(400).json({
        message: 'Water prediction failed',
        error: errorMsg,
        details: process.env.NODE_ENV !== 'production' ? {
          endpoint: error.endpoint,
          stage: error.stage,
        } : undefined,
      });
    }

    // Handle connection errors
    if (error.message && (error.message.includes('connect') || error.message.includes('ECONNREFUSED'))) {
      return res.status(503).json({
        message: 'Water prediction service unavailable',
        error: 'Unable to connect to prediction service. Please try again later.',
      });
    }

    res.status(500).json({
      message: 'Server error during water prediction',
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while processing your request'
        : error.message || 'Unknown error occurred',
    });
  }
};

// @desc    Predict water requirements based on crop, soil, month, season, and temperature (GET)
// @route   GET /api/crop/predict-water
// @access  Public
// Note: Year is hardcoded to 2025
exports.predictWaterGet = async (req, res) => {
  try {
    const { crop, soil, month, season, temperature } = req.query;
    const result = await processWaterPrediction(crop, soil, month, season, temperature);
    
    res.status(200).json({
      message: 'Water prediction generated successfully',
      ...result,
    });
  } catch (error) {
    // Handle validation errors
    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
        error: error.error,
      });
    }

    console.error('Water prediction error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error type:', error.type);
    console.error('Error message:', error.message);

    // Handle Gradio API specific errors
    if (error.type === 'status' || error.success === false) {
      const errorMsg = error.message || 'Prediction service returned an error';
      return res.status(400).json({
        message: 'Water prediction failed',
        error: errorMsg,
        details: process.env.NODE_ENV !== 'production' ? {
          endpoint: error.endpoint,
          stage: error.stage,
        } : undefined,
      });
    }

    // Handle connection errors
    if (error.message && (error.message.includes('connect') || error.message.includes('ECONNREFUSED'))) {
      return res.status(503).json({
        message: 'Water prediction service unavailable',
        error: 'Unable to connect to prediction service. Please try again later.',
      });
    }

    res.status(500).json({
      message: 'Server error during water prediction',
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while processing your request'
        : error.message || 'Unknown error occurred',
    });
  }
};


// @desc    Get available options for crop prediction
// @route   GET /api/crop/options
// @access  Public
exports.getOptions = (req, res) => {
  res.status(200).json({
    // Crop prediction options
    cropPrediction: {
      seasons: ['Kharif', 'Rabi', 'Zaid'],
      months: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ],
      soilTypes: ['Clay', 'Loam', 'Sandy', 'Silt'],
      yearRange: {
        min: 2000,
        max: 2100,
        default: 2025,
      },
    },
    // Water prediction options
    waterPrediction: {
      crops: [
        'Lettuce',
        'Microgreens',
        'Tomato',
        'Strawberry',
        'Pepper/Chili',
        'Eggplant',
        'Onion'
      ],
      seasons: ['Summer', 'Monsoon', 'Winter'],
      months: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ],
      soilTypes: ['Clay', 'Sandy', 'Loamy'],
      temperatures: [18, 20, 22, 25, 28, 30, 32, 35],
      // Year options for dropdown (currently fixed to 2025)
      years: ['2025'],
      year: "2025", // Fixed to 2025 in the prediction service
    },
  });
};

