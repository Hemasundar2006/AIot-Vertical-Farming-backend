const SensorData = require('../models/SensorData');
const { store, upsertZone } = require('../shared/latestData');

const ZONE3_KEY = 'zone3';

// @desc   Get the single latest Zone 3 reading from MongoDB
// @route  GET /api/zone3/latest
// @access Public
exports.getLatest = async (req, res) => {
  try {
    let doc = await SensorData.findOne({ zone: ZONE3_KEY })
      .sort({ timestamp: -1 })
      .lean();

    // Check in-memory store fallback if DB document is missing
    const memZone = (store.zones || []).find((z) => z.id === 3);

    if (!doc && !memZone) {
      return res.status(200).json({
        success: true,
        zone: 'zone3',
        connected: false,
        isLive: false,
        data: null
      });
    }

    const docTime = doc && doc.timestamp
      ? new Date(doc.timestamp).getTime()
      : (memZone && memZone.timestamp ? new Date(memZone.timestamp).getTime() : 0);
    const isConnected = docTime > 0 && (Date.now() - docTime) < 60000; // Disconnected if no ping within 1m

    let formattedData = doc
      ? formatDoc(doc)
      : {
        id: 'live',
        zone: 'zone3',
        zoneId: '3',
        soil: memZone.soil,
        temperature: memZone.temperature,
        humidity: memZone.humidity,
        gas: memZone.gas,
        light: memZone.light,
        motor: memZone.motor,
        timestamp: memZone.timestamp || new Date(),
      };

    if (!isConnected) {
      formattedData.soil = 0;
      formattedData.temperature = 0;
      formattedData.humidity = 0;
      formattedData.gas = 0;
      formattedData.light = 0;
      formattedData.motor = "OFF";
    }

    res.status(200).json({
      success: true,
      data: {
        zones: [
          {
            id: 3,
            zone: "zone3",
            soil: formattedData.soil,
            temperature: formattedData.temperature,
            humidity: formattedData.humidity,
            gas: formattedData.gas,
            light: formattedData.light,
            motor: formattedData.motor,
            timestamp: formattedData.timestamp,
            isLive: isConnected
          }
        ],
        mode: store.mode || "AUTO"
      }
    });
  } catch (err) {
    console.error('zone3/latest error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get latest reading for Zone 3 only (1st and 2nd zones excluded)
// @route  GET /api/zone3/all-latest
// @access Public
exports.getAllLatest = async (req, res) => {
  try {
    const doc = await SensorData.findOne({ zone: ZONE3_KEY }).sort({ timestamp: -1 }).lean();
    const memZone = (store.zones || []).find((z) => z.id === 3);

    const docTime = doc && doc.timestamp
      ? new Date(doc.timestamp).getTime()
      : (memZone && memZone.timestamp ? new Date(memZone.timestamp).getTime() : 0);
    const isConnected = docTime > 0 && (Date.now() - docTime) < 60000;

    let formattedData = doc
      ? formatDoc(doc)
      : (memZone ? {
        id: 'live',
        zone: 'zone3',
        zoneId: '3',
        soil: memZone.soil,
        temperature: memZone.temperature,
        humidity: memZone.humidity,
        gas: memZone.gas,
        light: memZone.light,
        motor: memZone.motor,
        timestamp: memZone.timestamp || new Date(),
      } : null);

    if (formattedData && !isConnected) {
      formattedData.soil = 0;
      formattedData.temperature = 0;
      formattedData.humidity = 0;
      formattedData.gas = 0;
      formattedData.light = 0;
      formattedData.motor = "OFF";
    }

    res.status(200).json({
      success: true,
      timestamp: new Date(),
      zone: 'zone3',
      data: formattedData,
      zones: {
        zone3: formattedData
      }
    });
  } catch (err) {
    console.error('zone3/all-latest error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get Zone 3 history – last N readings (default 50, max 500)
// @route  GET /api/zone3/history?limit=50
// @access Public
exports.getHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);

    const docs = await SensorData.find({ zone: ZONE3_KEY })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({ success: true, zone: 'zone3', count: docs.length, data: docs.map(formatDoc) });
  } catch (err) {
    console.error('zone3/history error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get Zone 3 all readings for a specific day
// @route  GET /api/zone3/daily?date=YYYY-MM-DD
// @access Public
exports.getDaily = async (req, res) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date. Use YYYY-MM-DD' });
    }

    const data = await SensorData.getDailyData(ZONE3_KEY, targetDate);

    res.status(200).json({
      success: true,
      zone: 'zone3',
      date: targetDate.toISOString().split('T')[0],
      count: data.length,
      data: data.map(formatDoc),
      summary: buildSummary(data),
    });
  } catch (err) {
    console.error('zone3/daily error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get Zone 3 per-day aggregates for a month
// @route  GET /api/zone3/monthly?year=YYYY&month=MM
// @access Public
exports.getMonthly = async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;

    if (year < 2000 || year > 2100) return res.status(400).json({ success: false, message: 'Year must be 2000-2100' });
    if (month < 1 || month > 12) return res.status(400).json({ success: false, message: 'Month must be 1-12' });

    const data = await SensorData.getMonthlyData(ZONE3_KEY, year, month);

    res.status(200).json({
      success: true, zone: 'zone3', year, month, count: data.length,
      data: data.map((d) => ({
        date: d._id,
        avgSoil: round2(d.avgSoil),
        avgTemp: round2(d.avgTemp),
        avgHum: round2(d.avgHum),
        avgGas: round2(d.avgGas),
        avgLight: round2(d.avgLight),
        maxTemp: d.maxTemp,
        minTemp: d.minTemp,
        maxHum: d.maxHum,
        minHum: d.minHum,
        readings: d.count,
      })),
    });
  } catch (err) {
    console.error('zone3/monthly error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get Zone 3 summary stats for a custom time range
// @route  GET /api/zone3/stats?from=ISO&to=ISO
// @access Public
exports.getStats = async (req, res) => {
  try {
    const now = new Date();
    const from = req.query.from ? new Date(req.query.from) : new Date(now - 24 * 60 * 60 * 1000);
    const to = req.query.to ? new Date(req.query.to) : now;

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid from/to date' });
    }

    const data = await SensorData.find({ zone: ZONE3_KEY, timestamp: { $gte: from, $lte: to } }).lean();

    res.status(200).json({ success: true, zone: 'zone3', from, to, count: data.length, summary: buildSummary(data) });
  } catch (err) {
    console.error('zone3/stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Receive Zone 3 sensor data from the 2nd ESP32
// @route  POST /api/zone3/data
// @access Public
exports.receiveData = async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    // ── Parse flexible single-zone payload from ESP32 ────────────────────────
    let raw = body;

    if (body.zone3 && typeof body.zone3 === 'object') {
      raw = body.zone3;
    } else if (body.z3 && typeof body.z3 === 'object') {
      raw = body.z3;
    } else if (Array.isArray(body.zones)) {
      raw = body.zones.find((z) => Number(z.id || z.zoneId) === 3 || z.zone === 'zone3') || body.zones[0] || {};
    } else if (Array.isArray(body)) {
      raw = body.find((z) => Number(z.id || z.zoneId) === 3 || z.zone === 'zone3') || body[0] || {};
    } else if (body.zone1 && typeof body.zone1 === 'object' && !body.zone2 && !body.zone3) {
      // Single zone sent to zone 3 endpoint
      raw = body.zone1;
    }

    if (!raw || typeof raw !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'No sensor data found in payload',
      });
    }

    const soil = Number(raw.soil ?? raw.moisture ?? raw.soilMoisture ?? 0);
    const temp = Number(raw.temperature ?? raw.temp ?? 0);
    const hum = Number(raw.humidity ?? raw.hum ?? 0);
    const gas = Number(raw.gas ?? 0);
    const light = Number(raw.light ?? raw.ldr ?? 0);
    const relay = String(raw.motor ?? raw.relay ?? 'OFF').toUpperCase() === 'ON' ? 'ON' : 'OFF';

    console.log('📡 [ESP32 #2] Zone 3 data received:', { soil, temp, hum, gas, light, relay });

    // ── Update shared in-memory store ────────────────────────────────────────
    upsertZone({
      id: 3,
      soil,
      temperature: temp,
      humidity: hum,
      gas,
      light,
      motor: relay,
    });

    // ── Persist to MongoDB ───────────────────────────────────────────────────
    try {
      await SensorData.create({
        zone: ZONE3_KEY,
        zoneId: '3',
        soil,
        temp,
        hum,
        gas,
        light,
        relay,
        timestamp: new Date(),
      });
      console.log('✅ Zone 3 data saved to MongoDB');
    } catch (dbErr) {
      console.warn('⚠️ Zone 3 MongoDB save failed:', dbErr.message);
    }

    res.status(200).json({
      success: true,
      message: '✅ Zone 3 data received and stored',
      data: { id: 3, zone: 'zone3', soil, temperature: temp, humidity: hum, gas, light, motor: relay },
    });
  } catch (err) {
    console.error('zone3/receiveData error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDoc(doc) {
  return {
    id: doc._id,
    zone: doc.zone,
    zoneId: doc.zoneId,
    soil: doc.soil,
    temperature: doc.temp,
    humidity: doc.hum,
    gas: doc.gas,
    light: doc.light,
    motor: doc.relay,
    timestamp: doc.timestamp,
  };
}

function buildSummary(data) {
  if (!data || data.length === 0) return null;
  return {
    count: data.length,
    avgSoil: round2(avg(data, 'soil')),
    avgTemp: round2(avg(data, 'temp')),
    avgHum: round2(avg(data, 'hum')),
    avgGas: round2(avg(data, 'gas')),
    avgLight: round2(avg(data, 'light')),
    maxTemp: Math.max(...data.map((d) => d.temp)),
    minTemp: Math.min(...data.map((d) => d.temp)),
    maxHum: Math.max(...data.map((d) => d.hum)),
    minHum: Math.min(...data.map((d) => d.hum)),
  };
}

function avg(arr, key) { return arr.reduce((s, d) => s + (d[key] || 0), 0) / arr.length; }
function round2(n) { return Math.round(n * 100) / 100; }
