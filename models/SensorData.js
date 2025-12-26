const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema(
  {
    zone: {
      type: String,
      required: true,
      enum: ['zone1', 'zone2', 'zone3'],
      index: true,
    },
    zoneId: {
      type: String,
      required: true,
    },
    soil: {
      type: Number,
      required: true,
    },
    temp: {
      type: Number,
      required: true,
    },
    hum: {
      type: Number,
      required: true,
    },
    gas: {
      type: Number,
      required: true,
    },
    light: {
      type: Number,
      required: true,
    },
    relay: {
      type: String,
      required: true,
      enum: ['ON', 'OFF'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries by zone and date
sensorDataSchema.index({ zone: 1, timestamp: -1 });
sensorDataSchema.index({ timestamp: -1 });

// Method to get daily aggregated data
sensorDataSchema.statics.getDailyData = async function (zone, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const query = {
    zone: zone,
    timestamp: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  };

  return this.find(query).sort({ timestamp: 1 });
};

// Method to get monthly aggregated data
sensorDataSchema.statics.getMonthlyData = async function (zone, year, month) {
  const startOfMonth = new Date(year, month - 1, 1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const query = {
    zone: zone,
    timestamp: {
      $gte: startOfMonth,
      $lte: endOfMonth,
    },
  };

  // Group by day and calculate averages
  const dailyData = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
        },
        avgSoil: { $avg: '$soil' },
        avgTemp: { $avg: '$temp' },
        avgHum: { $avg: '$hum' },
        avgGas: { $avg: '$gas' },
        avgLight: { $avg: '$light' },
        maxTemp: { $max: '$temp' },
        minTemp: { $min: '$temp' },
        maxHum: { $max: '$hum' },
        minHum: { $min: '$hum' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return dailyData;
};

const SensorData = mongoose.model('SensorData', sensorDataSchema);

module.exports = SensorData;

