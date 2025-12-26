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

// @desc    Get available options for crop prediction
// @route   GET /api/crop/options
// @access  Public
exports.getOptions = (req, res) => {
  res.status(200).json({
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
  });
};

