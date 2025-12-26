const SensorData = require('../models/SensorData');

// @desc    Get daily sensor data for a specific zone
// @route   GET /api/sensor/daily/:zone?date=YYYY-MM-DD
// @access  Public
exports.getDailyData = async (req, res) => {
  try {
    const { zone } = req.params;
    const { date } = req.query;

    // Validate zone
    if (!['zone1', 'zone2', 'zone3'].includes(zone)) {
      return res.status(400).json({
        message: 'Invalid zone',
        error: 'Zone must be zone1, zone2, or zone3',
      });
    }

    // Use provided date or default to today
    const targetDate = date ? new Date(date) : new Date();
    
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        message: 'Invalid date format',
        error: 'Date must be in YYYY-MM-DD format',
      });
    }

    const data = await SensorData.getDailyData(zone, targetDate);

    // Format data for frontend
    const formattedData = {
      zone,
      date: targetDate.toISOString().split('T')[0],
      data: data.map((item) => ({
        time: item.timestamp,
        soil: item.soil,
        temp: item.temp,
        hum: item.hum,
        gas: item.gas,
        light: item.light,
        relay: item.relay,
      })),
      summary: data.length > 0 ? {
        avgSoil: data.reduce((sum, d) => sum + d.soil, 0) / data.length,
        avgTemp: data.reduce((sum, d) => sum + d.temp, 0) / data.length,
        avgHum: data.reduce((sum, d) => sum + d.hum, 0) / data.length,
        avgGas: data.reduce((sum, d) => sum + d.gas, 0) / data.length,
        avgLight: data.reduce((sum, d) => sum + d.light, 0) / data.length,
        maxTemp: Math.max(...data.map((d) => d.temp)),
        minTemp: Math.min(...data.map((d) => d.temp)),
        maxHum: Math.max(...data.map((d) => d.hum)),
        minHum: Math.min(...data.map((d) => d.hum)),
        totalReadings: data.length,
      } : null,
    };

    res.status(200).json({
      message: 'Daily data retrieved successfully',
      ...formattedData,
    });
  } catch (error) {
    console.error('Get daily data error:', error);
    res.status(500).json({
      message: 'Server error while retrieving daily data',
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred'
        : error.message,
    });
  }
};

// @desc    Get monthly sensor data for a specific zone
// @route   GET /api/sensor/monthly/:zone?year=YYYY&month=MM
// @access  Public
exports.getMonthlyData = async (req, res) => {
  try {
    const { zone } = req.params;
    const { year, month } = req.query;

    // Validate zone
    if (!['zone1', 'zone2', 'zone3'].includes(zone)) {
      return res.status(400).json({
        message: 'Invalid zone',
        error: 'Zone must be zone1, zone2, or zone3',
      });
    }

    // Use provided year/month or default to current month
    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;

    if (targetYear < 2000 || targetYear > 2100) {
      return res.status(400).json({
        message: 'Invalid year',
        error: 'Year must be between 2000 and 2100',
      });
    }

    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({
        message: 'Invalid month',
        error: 'Month must be between 1 and 12',
      });
    }

    const data = await SensorData.getMonthlyData(zone, targetYear, targetMonth);

    // Format data for frontend
    const formattedData = {
      zone,
      year: targetYear,
      month: targetMonth,
      data: data.map((item) => ({
        date: item._id,
        avgSoil: Math.round(item.avgSoil * 100) / 100,
        avgTemp: Math.round(item.avgTemp * 100) / 100,
        avgHum: Math.round(item.avgHum * 100) / 100,
        avgGas: Math.round(item.avgGas * 100) / 100,
        avgLight: Math.round(item.avgLight * 100) / 100,
        maxTemp: item.maxTemp,
        minTemp: item.minTemp,
        maxHum: item.maxHum,
        minHum: item.minHum,
        readings: item.count,
      })),
      summary: data.length > 0 ? {
        totalDays: data.length,
        overallAvgTemp: Math.round(
          (data.reduce((sum, d) => sum + d.avgTemp, 0) / data.length) * 100
        ) / 100,
        overallAvgHum: Math.round(
          (data.reduce((sum, d) => sum + d.avgHum, 0) / data.length) * 100
        ) / 100,
        overallAvgSoil: Math.round(
          (data.reduce((sum, d) => sum + d.avgSoil, 0) / data.length) * 100
        ) / 100,
        maxTemp: Math.max(...data.map((d) => d.maxTemp)),
        minTemp: Math.min(...data.map((d) => d.minTemp)),
        totalReadings: data.reduce((sum, d) => sum + d.count, 0),
      } : null,
    };

    res.status(200).json({
      message: 'Monthly data retrieved successfully',
      ...formattedData,
    });
  } catch (error) {
    console.error('Get monthly data error:', error);
    res.status(500).json({
      message: 'Server error while retrieving monthly data',
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred'
        : error.message,
    });
  }
};

// @desc    Get all zones daily data
// @route   GET /api/sensor/daily?date=YYYY-MM-DD
// @access  Public
exports.getAllZonesDailyData = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        message: 'Invalid date format',
        error: 'Date must be in YYYY-MM-DD format',
      });
    }

    const zones = ['zone1', 'zone2', 'zone3'];
    const allZonesData = {};

    for (const zone of zones) {
      const data = await SensorData.getDailyData(zone, targetDate);
      allZonesData[zone] = {
        data: data.map((item) => ({
          time: item.timestamp,
          soil: item.soil,
          temp: item.temp,
          hum: item.hum,
          gas: item.gas,
          light: item.light,
          relay: item.relay,
        })),
        summary: data.length > 0 ? {
          avgSoil: data.reduce((sum, d) => sum + d.soil, 0) / data.length,
          avgTemp: data.reduce((sum, d) => sum + d.temp, 0) / data.length,
          avgHum: data.reduce((sum, d) => sum + d.hum, 0) / data.length,
          avgGas: data.reduce((sum, d) => sum + d.gas, 0) / data.length,
          avgLight: data.reduce((sum, d) => sum + d.light, 0) / data.length,
          totalReadings: data.length,
        } : null,
      };
    }

    res.status(200).json({
      message: 'All zones daily data retrieved successfully',
      date: targetDate.toISOString().split('T')[0],
      zones: allZonesData,
    });
  } catch (error) {
    console.error('Get all zones daily data error:', error);
    res.status(500).json({
      message: 'Server error while retrieving data',
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred'
        : error.message,
    });
  }
};

// @desc    Get all zones monthly data
// @route   GET /api/sensor/monthly?year=YYYY&month=MM
// @access  Public
exports.getAllZonesMonthlyData = async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;

    if (targetYear < 2000 || targetYear > 2100 || targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({
        message: 'Invalid year or month',
        error: 'Year must be between 2000-2100 and month between 1-12',
      });
    }

    const zones = ['zone1', 'zone2', 'zone3'];
    const allZonesData = {};

    for (const zone of zones) {
      const data = await SensorData.getMonthlyData(zone, targetYear, targetMonth);
      allZonesData[zone] = {
        data: data.map((item) => ({
          date: item._id,
          avgSoil: Math.round(item.avgSoil * 100) / 100,
          avgTemp: Math.round(item.avgTemp * 100) / 100,
          avgHum: Math.round(item.avgHum * 100) / 100,
          avgGas: Math.round(item.avgGas * 100) / 100,
          avgLight: Math.round(item.avgLight * 100) / 100,
          maxTemp: item.maxTemp,
          minTemp: item.minTemp,
          readings: item.count,
        })),
        summary: data.length > 0 ? {
          totalDays: data.length,
          overallAvgTemp: Math.round(
            (data.reduce((sum, d) => sum + d.avgTemp, 0) / data.length) * 100
          ) / 100,
          overallAvgHum: Math.round(
            (data.reduce((sum, d) => sum + d.avgHum, 0) / data.length) * 100
          ) / 100,
          totalReadings: data.reduce((sum, d) => sum + d.count, 0),
        } : null,
      };
    }

    res.status(200).json({
      message: 'All zones monthly data retrieved successfully',
      year: targetYear,
      month: targetMonth,
      zones: allZonesData,
    });
  } catch (error) {
    console.error('Get all zones monthly data error:', error);
    res.status(500).json({
      message: 'Server error while retrieving data',
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred'
        : error.message,
    });
  }
};

