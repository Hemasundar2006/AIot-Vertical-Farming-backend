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

// @desc    Predict water requirements based on crop, soil, month, season, year, and temperature (POST)
// @route   POST /api/crop/predict-water
// @access  Public
// Note: Year is fixed to 2025
exports.predictWater = async (req, res) => {
  try {
    const { crop, soil, month, season, year, temperature } = req.body;
    
    // Validate required fields
    if (!crop || !soil || !month || !season || temperature === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: crop, soil, month, season, and temperature are required'
      });
    }

    // Validate crop
    const validCrops = ['Lettuce', 'Microgreens', 'Tomato', 'Strawberry', 'Pepper/Chili', 'Eggplant', 'Onion'];
    if (!validCrops.includes(crop)) {
      return res.status(400).json({
        error: `Invalid crop. Must be one of: ${validCrops.join(', ')}`
      });
    }

    // Validate soil
    const validSoils = ['Clay', 'Sandy', 'Loamy'];
    if (!validSoils.includes(soil)) {
      return res.status(400).json({
        error: `Invalid soil. Must be one of: ${validSoils.join(', ')}`
      });
    }

    // Validate month
    const validMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (!validMonths.includes(month)) {
      return res.status(400).json({
        error: `Invalid month. Must be one of: ${validMonths.join(', ')}`
      });
    }

    // Validate season
    const validSeasons = ['Summer', 'Monsoon', 'Winter'];
    if (!validSeasons.includes(season)) {
      return res.status(400).json({
        error: `Invalid season. Must be one of: ${validSeasons.join(', ')}`
      });
    }

    // Validate temperature
    const validTemperatures = [18, 20, 22, 25, 28, 30, 32, 35];
    const tempNum = typeof temperature === 'string' ? parseFloat(temperature) : temperature;
    if (isNaN(tempNum) || !validTemperatures.includes(tempNum)) {
      return res.status(400).json({
        error: `Invalid temperature. Must be one of: ${validTemperatures.join(', ')}`
      });
    }

    // Year is fixed to 2025 (ignore user input)
    const fixedYear = "2025";

    // Import Gradio client
    const gradioClient = require('@gradio/client');
    const Client = gradioClient.Client || gradioClient;

    // Connect to Gradio API
    const client = await Client.connect('sumiyon/water_only');

    // Make prediction
    const result = await client.predict('/predict_water', {
      crop: String(crop),
      soil: String(soil),
      month: String(month),
      season: String(season),
      year: fixedYear,
      temperature: String(temperature),
    });

    // Extract prediction result
    const prediction = Array.isArray(result.data) ? result.data[0] : result.data;

    // Return simplified response format
    res.status(200).json({
      prediction: `💧 Water Required: ${prediction} Liters / Month`
    });
  } catch (error) {
    console.error('Water prediction error:', error);
    res.status(500).json({
      error: 'Failed to predict water requirements'
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

// ---------------- Vertical vs Horizontal crop prediction (sumiyon/VerticalfhorizontalCROP) ----------------

// Helper to load Gradio Client in both CJS/ESM builds
const getVerticalHorizontalClient = () => {
  const gradioClient = require('@gradio/client');
  const Client = gradioClient.Client || gradioClient;
  return Client;
};

// Common validation for horizontal/vertical crop prediction
const validateVerticalHorizontalInput = (body) => {
  const {
    N,
    P,
    K,
    temperature,
    humidity,
    ph,
    rainfall,
    soiltype,
    season,
    month,
  } = body;

  const missingFields = [];
  if (N === undefined) missingFields.push('N');
  if (P === undefined) missingFields.push('P');
  if (K === undefined) missingFields.push('K');
  if (temperature === undefined) missingFields.push('temperature');
  if (humidity === undefined) missingFields.push('humidity');
  if (ph === undefined) missingFields.push('ph');
  if (rainfall === undefined) missingFields.push('rainfall');
  if (!soiltype) missingFields.push('soiltype');
  if (!season) missingFields.push('season');
  if (!month) missingFields.push('month');

  if (missingFields.length) {
    return {
      valid: false,
      error: {
        status: 400,
        message: 'Missing required fields',
        error: `The following fields are required: ${missingFields.join(', ')}`,
      },
    };
  }

  const numFields = { N, P, K, temperature, humidity, ph, rainfall };
  for (const [key, value] of Object.entries(numFields)) {
    if (typeof value !== 'number') {
      const num = Number(value);
      if (Number.isNaN(num)) {
        return {
          valid: false,
          error: {
            status: 400,
            message: 'Invalid input type',
            error: `${key} must be a number`,
          },
        };
      }
      numFields[key] = num;
    }
  }

  const allowedSeasons = ['Summer', 'Monsoon', 'Winter'];
  if (!allowedSeasons.includes(season)) {
    return {
      valid: false,
      error: {
        status: 400,
        message: 'Invalid season',
        error: `Season must be one of: ${allowedSeasons.join(', ')}`,
      },
    };
  }

  const allowedSoilTypes = ['Clay', 'Sandy', 'Loamy', 'Loam', 'Silt'];
  if (!allowedSoilTypes.includes(soiltype)) {
    return {
      valid: false,
      error: {
        status: 400,
        message: 'Invalid soil type',
        error: `Soil type must be one of: ${allowedSoilTypes.join(', ')}`,
      },
    };
  }

  // Month is passed as a string label like "December-February" per space docs, so just ensure non-empty

  return {
    valid: true,
    data: {
      ...numFields,
      soiltype,
      season,
      month,
    },
  };
};

// Internal helper to call the sumiyon/VerticalfhorizontalCROP space
const callVerticalHorizontalSpace = async (endpoint, payload) => {
  const Client = getVerticalHorizontalClient();
  const client = await Client.connect('sumiyon/VerticalfhorizontalCROP');
  const result = await client.predict(endpoint, payload);
  const prediction = Array.isArray(result.data) ? result.data[0] : result.data;
  return { prediction };
};

// @desc    Predict crop for horizontal farming layout
// @route   POST /api/crop/predict-horizontal
// @access  Public
exports.predictHorizontal = async (req, res) => {
  try {
    const validation = validateVerticalHorizontalInput(req.body || {});
    if (!validation.valid) {
      return res.status(validation.error.status).json({
        message: validation.error.message,
        error: validation.error.error,
      });
    }

    const payload = validation.data;
    const { prediction } = await callVerticalHorizontalSpace('/predict_horizontal', payload);

    res.status(200).json({
      message: 'Horizontal crop prediction generated successfully',
      prediction,
      input: payload,
      layout: 'horizontal',
    });
  } catch (error) {
    console.error('Horizontal crop prediction error:', error);

    if (error.message && (error.message.includes('connect') || error.message.includes('ECONNREFUSED'))) {
      return res.status(503).json({
        message: 'Horizontal crop prediction service unavailable',
        error: 'Unable to connect to prediction service. Please try again later.',
      });
    }

    res.status(500).json({
      message: 'Server error during horizontal crop prediction',
      error:
        process.env.NODE_ENV === 'production'
          ? 'An error occurred while processing your request'
          : error.message || 'Unknown error occurred',
    });
  }
};

// @desc    Predict crop for vertical farming layout
// @route   POST /api/crop/predict-vertical
// @access  Public
exports.predictVertical = async (req, res) => {
  try {
    const validation = validateVerticalHorizontalInput(req.body || {});
    if (!validation.valid) {
      return res.status(validation.error.status).json({
        message: validation.error.message,
        error: validation.error.error,
      });
    }

    const payload = validation.data;
    const { prediction } = await callVerticalHorizontalSpace('/predict_vertical', payload);

    res.status(200).json({
      message: 'Vertical crop prediction generated successfully',
      prediction,
      input: payload,
      layout: 'vertical',
    });
  } catch (error) {
    console.error('Vertical crop prediction error:', error);

    if (error.message && (error.message.includes('connect') || error.message.includes('ECONNREFUSED'))) {
      return res.status(503).json({
        message: 'Vertical crop prediction service unavailable',
        error: 'Unable to connect to prediction service. Please try again later.',
      });
    }

    res.status(500).json({
      message: 'Server error during vertical crop prediction',
      error:
        process.env.NODE_ENV === 'production'
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

// @desc    Stream YouTube video through server to avoid client IP/token issues
// @route   GET /api/stream/youtube?url=<youtube_url>
// @access  Public (apply auth/rate-limit in router as needed)
exports.streamYouTube = async (req, res) => {
  const youtubeUrl = req.query.url;

  const isValidYouTubeUrl = (url) => {
    if (!url) return false;
    try {
      const u = new URL(url);
      if (!/^(www\.)?youtube\.com$|^youtu\.be$/i.test(u.hostname)) return false;
      return u.searchParams.has('v') || u.pathname.startsWith('/shorts/');
    } catch (err) {
      return false;
    }
  };

  if (!isValidYouTubeUrl(youtubeUrl)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  // Lazy-load ytdl-core to avoid dependency errors during startup
  let ytdl;
  try {
    ytdl = require('ytdl-core');
  } catch (err) {
    console.error('Failed to load ytdl-core:', err);
    return res.status(500).json({ error: 'Streaming dependency missing' });
  }

  try {
    const info = await ytdl.getInfo(youtubeUrl);
    const format =
      info.formats.find((f) => f.isHLS || f.mimeType?.includes('application/vnd.apple.mpegurl')) ||
      ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });

    if (!format?.url) {
      return res.status(404).json({ error: 'No playable stream found' });
    }

    res.setHeader('Content-Type', format.mimeType || 'video/mp4');
    res.setHeader('Transfer-Encoding', 'chunked');

    const stream = ytdl.downloadFromInfo(info, {
      format,
      filter: 'audioandvideo',
      highWaterMark: 1 << 25, // 32MB buffer to reduce stutter
    });

    stream.on('error', (err) => {
      console.error('ytdl stream error:', err);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Upstream stream failed' });
      } else {
        res.destroy(err);
      }
    });

    req.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch (err) {
    console.error('streamYouTube error:', err?.message || err);
    const msg =
      /unavailable|private|removed/i.test(err?.message || '')
        ? 'Video unavailable'
        : /Too Many Requests|429/.test(err?.message || '')
        ? 'Rate limited by YouTube'
        : 'Failed to resolve stream';
    res.status(500).json({ error: msg });
  }
};

