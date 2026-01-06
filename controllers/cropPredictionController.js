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

// @desc    Predict water requirements based on crop, soil, month, season, year, and temperature
// @route   POST /api/crop/predict-water
// @access  Public
exports.predictWater = async (req, res) => {
  try {
    const { crop, soil, month, season, year, temperature } = req.body;

    // Validate required fields
    if (!crop || !soil || !month || !season || !year || temperature === undefined) {
      return res.status(400).json({
        message: 'Missing required fields',
        error: 'crop, soil, month, season, year, and temperature are required',
      });
    }

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
      return res.status(400).json({
        message: 'Invalid crop',
        error: `Crop must be one of: ${validCrops.join(', ')}`,
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

    // Validate season
    const validSeasons = ['Summer', 'Monsoon', 'Winter'];
    if (!validSeasons.includes(season)) {
      return res.status(400).json({
        message: 'Invalid season',
        error: `Season must be one of: ${validSeasons.join(', ')}`,
      });
    }

    // Validate soil type
    const validSoilTypes = ['Clay', 'Sandy', 'Loamy'];
    if (!validSoilTypes.includes(soil)) {
      return res.status(400).json({
        message: 'Invalid soil type',
        error: `Soil type must be one of: ${validSoilTypes.join(', ')}`,
      });
    }

    // Validate temperature - only specific values allowed
    const validTemperatures = [18, 20, 22, 25, 28, 30, 32, 35];
    const tempNum = typeof temperature === 'string' ? parseFloat(temperature) : temperature;
    if (isNaN(tempNum) || !validTemperatures.includes(tempNum)) {
      return res.status(400).json({
        message: 'Invalid temperature',
        error: `Temperature must be one of: ${validTemperatures.join(', ')}`,
      });
    }

    // Ensure year is a string (Gradio API is strict about types)
    const yearStr = String(year);

    // Import Gradio client
    let Client;
    try {
      const gradioClient = require('@gradio/client');
      // Handle both named export { Client } and default export
      Client = gradioClient.Client || gradioClient;
    } catch (error) {
      console.error('Failed to load @gradio/client:', error);
      return res.status(500).json({
        message: 'Water prediction service not available',
        error: '@gradio/client package is not installed. Please install it: npm install @gradio/client',
      });
    }

    // Connect to Gradio API (sumiyon/water_only space)
    const client = await Client.connect('sumiyon/water_only');

    // Make prediction - API expects all parameters as strings
    // Ensure all values are explicitly converted to strings
    const predictionParams = {
      crop: String(crop),
      soil: String(soil),
      month: String(month),
      season: String(season),
      year: String(yearStr), // Double ensure it's a string
      temperature: String(temperature),
    };

    console.log('Sending prediction params:', predictionParams);

    const result = await client.predict('/predict_water', predictionParams);

    // Extract the prediction result
    // Gradio returns data in result.data array, first element is the prediction
    const waterPrediction = Array.isArray(result.data) ? result.data[0] : result.data;

    res.status(200).json({
      message: 'Water prediction generated successfully',
      prediction: waterPrediction,
      input: {
        crop,
        soil,
        month,
        season,
        year: yearStr,
        temperature: temperature.toString(),
      },
    });
  } catch (error) {
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
      yearRange: {
        min: 2000,
        max: 2100,
        default: 2025,
      },
    },
  });
};

