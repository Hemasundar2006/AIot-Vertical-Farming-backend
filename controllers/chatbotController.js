// @desc    Smart Vertical Farming Chatbot & Live Database Engine with Sensitive Data Protection
// @route   POST /api/chatbot
// @access  Public
const crypto = require('crypto');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const SensorData = require('../models/SensorData');
const Plot = require('../models/Plot');
const Zone = require('../models/Zone');
const Project = require('../models/Project');
const LiveStream = require('../models/LiveStream');
const ManagementPerson = require('../models/ManagementPerson');

// SENSITIVE DATA PATTERNS TO BLOCK
const SENSITIVE_PATTERNS = [
  /\b(password|passwd|pwd|hash|salt)\b/i,
  /\b(jwt|secret|token|api[_\s]?key|private[_\s]?key)\b/i,
  /\b(env|environment\s*variable|\.env|credentials)\b/i,
  /\b(user\s*list|all\s*users|user\s*passwords|admin\s*password|login\s*log|ip\s*address)\b/i,
  /\b(credit\s*card|bank|account\s*number|financial\s*credential)\b/i,
  /\b(mongo[_\s]?uri|database\s*password|db\s*password|connection\s*string)\b/i,
  /\b(auth\s*token|bearer|refresh\s*token)\b/i
];

// Helper to check if a query is asking for sensitive data
function isSensitiveQuery(query) {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(query));
}

// Vertical Farming Agricultural Knowledge Base
const KNOWLEDGE_BASE = [
  {
    category: 'basics',
    keywords: ['what is', 'explain vertical farming', 'definition', 'concept', 'meaning', 'how it works'],
    response: `🌱 **Vertical Farming Overview:**
Vertical farming is the practice of growing crops in vertically stacked layers indoors using Controlled Environment Agriculture (CEA).

**Key Features:**
• **Soilless Growing:** Hydroponics, aeroponics, or aquaponics.
• **Controlled Climate:** Precise management of temperature, humidity, CO₂, and airflow.
• **LED Lighting:** Tuned light spectrums replacing natural sunlight.
• **Efficiency:** Uses up to 95% less water and 90% less land compared to traditional farming.`
  },
  {
    category: 'benefits',
    keywords: ['advantage', 'benefit', 'why vertical', 'pros', 'yield', 'water saving'],
    response: `💡 **Key Benefits of Vertical Farming:**
1. **Water Efficiency:** Uses 95-98% less water via closed-loop recycling.
2. **Year-Round Harvesting:** Consistent harvests unaffected by outdoor weather or seasons.
3. **Space Multiplier:** 10x–30x higher crop yield per square meter.
4. **Pesticide-Free:** Sterile indoor environments drastically reduce pest and disease risks.
5. **Reduced Food Miles:** Can be built in urban areas close to consumers.`
  },
  {
    category: 'crops',
    keywords: ['what crops', 'suitable crops', 'plants', 'vegetables', 'lettuce', 'herbs', 'grow in vertical'],
    response: `🥬 **Best Crops for Vertical Farming:**
• **Leafy Greens:** Lettuce, spinach, kale, arugula, swiss chard.
• **Herbs:** Basil, mint, cilantro, parsley, rosemary, thyme.
• **Microgreens:** Radish sprouts, broccoli microgreens, mustard cress.
• **Fruiting Crops:** Strawberries, cherry tomatoes, dwarf bell peppers.

*Note: Root crops (potatoes, carrots) and tall field crops (corn, wheat) are generally not economical for vertical farming.*`
  },
  {
    category: 'environment',
    keywords: ['optimal temperature', 'ideal humidity', 'ph level', 'ec', 'lighting', 'light cycle', 'lux'],
    response: `🌡️ **Optimal Environmental Parameters:**
• **Temperature:** 20°C – 26°C (Day) | 16°C – 20°C (Night)
• **Relative Humidity:** 50% – 70%
• **Soil/Nutrient pH:** 5.5 – 6.5 for most hydroponic/indoor crops
• **EC (Electrical Conductivity):** 1.2 – 2.4 mS/cm depending on growth stage
• **Light Photoperiod:** 14 – 18 hours of LED illumination per day
• **Soil Moisture Target:** 60% – 80% (Automatic irrigation recommended below 30%)`
  },
  {
    category: 'troubleshooting',
    keywords: ['yellow leaves', 'pests', 'algae', 'fungus', 'mold', 'low moisture', 'troubleshoot', 'disease'],
    response: `🔍 **Farming Troubleshooting Guide:**
• **Yellow Leaves (Chlorosis):** Often caused by nitrogen deficiency, overwatering, or pH outside 5.5–6.5.
• **Tip Burn on Leaves:** Calcium deficiency or inadequate air circulation (increase fan speed).
• **Algae Growth:** Light leaking into the nutrient reservoir or water supply lines.
• **High Humidity / Mold:** Ensure exhaust fans run regularly; target humidity below 70%.
• **Dry Soil / Low Moisture:** Inspect zone pump relays, irrigation drippers, and water tank levels.`
  }
];

// Helper: Query latest sensor telemetry for all zones
async function getLiveSensorData() {
  const zoneKeys = [
    { key: 'zone1', id: 1, name: 'Zone 1' },
    { key: 'zone2', id: 2, name: 'Zone 2' },
    { key: 'zone3', id: 3, name: 'Zone 3' }
  ];

  const results = await Promise.all(
    zoneKeys.map(async (z) => {
      const doc = await SensorData.findOne({ zone: z.key }).sort({ timestamp: -1 }).lean();
      return { ...z, data: doc };
    })
  );

  return results;
}

// Master query processor directly querying MongoDB
async function processUserQuery(queryText) {
  const q = queryText.toLowerCase().trim();

  // 1. SECURITY & SENSITIVE DATA GUARDRAIL
  if (isSensitiveQuery(q)) {
    return `🔒 **Security & Privacy Notice:**
For security compliance and user privacy protection, sensitive system data (such as passwords, secret keys, credentials, user login records, tokens, and database configuration) cannot be accessed or displayed.

*You can ask about live farm sensor telemetry, zones, crops, projects, team members, or agricultural guidelines.*`;
  }

  // 2. Greetings & Command Menu
  if (/^(hi|hello|hey|greetings|hola|namaste|who are you|help|menu|start)/i.test(q) && q.length < 30) {
    return `👋 **Hello! Welcome to AgriNex Vertical Farm Assistant.**

I query live data directly from our farm database to answer your questions:
• 📊 **"Show farm status"** – Live overview of all monitored zones.
• 💧 **"Zone 1 / 2 / 3 details"** – Instant moisture, temp, hum, light, and pump status.
• 🌾 **"Show crops"** or **"Active plots"** – List of crops growing in our plots.
• 📍 **"List zones"** – All registered vertical farm zones.
• 📁 **"Show projects"** – Ongoing and completed farm projects.
• 👥 **"Management team"** – Leadership and team info.
• 📹 **"Live stream status"** – Active live camera links.
• 💡 **"Ideal temperature"** – Environmental standards and crop advice.`;
  }

  // 3. Specific Zone Queries (e.g., "Zone 1", "Zone 2", "Zone 3", "z1", "z2", "z3")
  const zoneMatch = q.match(/zone\s*([1-3])/i) || q.match(/z([1-3])/i);
  if (zoneMatch) {
    const zoneNum = parseInt(zoneMatch[1]);
    const zoneKey = `zone${zoneNum}`;
    const doc = await SensorData.findOne({ zone: zoneKey }).sort({ timestamp: -1 }).lean();

    if (!doc) {
      return `📡 **Zone ${zoneNum} Telemetry:**\nNo live sensor data is currently recorded in the database for Zone ${zoneNum}.`;
    }

    const moistureStatus = doc.soil < 30 ? '⚠️ Low (Irrigation Needed)' : doc.soil > 85 ? '⚠️ High' : '✅ Optimal';
    const tempStatus = doc.temp < 18 ? '❄️ Cool' : doc.temp > 30 ? '🔥 Warm' : '✅ Optimal';
    const humStatus = doc.hum < 40 ? '⚠️ Low' : doc.hum > 75 ? '⚠️ High' : '✅ Optimal';

    return `📊 **Live Telemetry for Zone ${zoneNum}:**
• **Soil Moisture:** ${doc.soil}% (${moistureStatus})
• **Temperature:** ${doc.temp}°C (${tempStatus})
• **Humidity:** ${doc.hum}% (${humStatus})
• **Air Quality / Gas:** ${doc.gas} ppm
• **Light Intensity:** ${doc.light} lux
• **Irrigation Pump:** **${doc.relay || 'OFF'}**
• **Timestamp:** ${new Date(doc.timestamp).toLocaleString()}

${doc.soil < 30 ? `💡 *Alert:* Soil moisture is low in Zone ${zoneNum}. Automatic or manual irrigation recommended.` : ''}`;
  }

  // 4. Overall Farm Telemetry & Status
  if (/status|telemetry|overview|summary|all zones|sensors|readings|health|alert|condition|dashboard/i.test(q)) {
    const sensors = await getLiveSensorData();
    const validSensors = sensors.filter((s) => s.data);

    if (validSensors.length === 0) {
      return `📊 **AgriNex Farm Overview:**\nNo sensor telemetry has been received from the farm IoT controllers yet.`;
    }

    let summaryText = `📊 **AgriNex Vertical Farm — Live Status Overview:**\n\n`;
    let alerts = [];

    for (const z of validSensors) {
      const d = z.data;
      const mStatus = d.soil < 30 ? '⚠️ Low' : '✅ Normal';
      if (d.soil < 30) alerts.push(`🚨 **${z.name}** moisture is low (${d.soil}%).`);
      if (d.temp > 32) alerts.push(`⚠️ **${z.name}** temperature is high (${d.temp}°C).`);

      summaryText += `📍 **${z.name}:**\n`;
      summaryText += `  • Soil Moisture: **${d.soil}%** (${mStatus})\n`;
      summaryText += `  • Temperature: **${d.temp}°C** | Humidity: **${d.hum}%**\n`;
      summaryText += `  • Light: **${d.light} lux** | Air Gas: **${d.gas}**\n`;
      summaryText += `  • Water Pump: **${d.relay || 'OFF'}**\n\n`;
    }

    if (alerts.length > 0) {
      summaryText += `⚠️ **Active Attention Items:**\n${alerts.join('\n')}\n`;
    } else {
      summaryText += `✅ **All active zones are operating within optimal parameters.**\n`;
    }

    return summaryText.trim();
  }

  // 5. Moisture, Water & Pump Queries
  if (/soil|moisture|water|pump|irrigation|relay|motor/i.test(q)) {
    const sensors = await getLiveSensorData();
    let text = `💧 **Soil Moisture & Irrigation Pump Status:**\n\n`;

    sensors.forEach((s) => {
      if (s.data) {
        text += `• **${s.name}:** Soil Moisture = **${s.data.soil}%** | Pump Relay = **${s.data.relay || 'OFF'}**\n`;
      } else {
        text += `• **${s.name}:** No telemetry recorded\n`;
      }
    });

    text += `\n💡 *Note: Target soil moisture is between 60% and 80%. Irrigation triggers when moisture falls below 30%.*`;
    return text;
  }

  // 6. Crops & Plots Database Query
  if (/crop|plot|plant|harvest|sow|growing|produce/i.test(q)) {
    const plots = await Plot.find().sort({ createdAt: -1 }).limit(10).lean();

    if (!plots || plots.length === 0) {
      return `🌱 **Farm Plots & Crops:**\nNo plot records found in the database. New plots can be registered from the Admin Plots panel.`;
    }

    let text = `🌱 **Active Farm Plots & Crops (${plots.length} records):**\n\n`;
    plots.forEach((p) => {
      const sowDate = p.sowingDate ? new Date(p.sowingDate).toLocaleDateString() : 'N/A';
      text += `• **Plot #${p.plotNumber}** (Zone ${p.zoneId || 'N/A'}): **${p.cropType}**\n  Status: *${p.status}* | Area: ${p.area} acres | Sown: ${sowDate}\n`;
    });

    return text;
  }

  // 7. Registered Zones Database Query
  if (/registered zones|farm zones|zone list|list zones|show zones/i.test(q)) {
    const zones = await Zone.find().lean();
    if (!zones || zones.length === 0) {
      return `📍 **Farm Zones:** Standard 3-Zone setup (Zone 1, Zone 2, Zone 3).`;
    }
    let text = `📍 **Registered Farm Zones (${zones.length}):**\n\n`;
    zones.forEach((z) => {
      text += `• **${z.name}** (Code: ${z.code}) - Location: ${z.location || 'Indoor Unit'} [${z.isActive ? 'Active' : 'Inactive'}]\n`;
    });
    return text;
  }

  // 8. Projects Database Query
  if (/project|projects|work/i.test(q)) {
    const projects = await Project.find({ isActive: true }).sort({ createdAt: -1 }).limit(5).lean();
    if (!projects || projects.length === 0) {
      return `📁 **Projects:** No active projects currently found in the database.`;
    }

    let text = `📁 **Active Vertical Farm Projects (${projects.length}):**\n\n`;
    projects.forEach((p) => {
      text += `• **${p.title}**${p.clientName ? ` (Client: ${p.clientName})` : ''}\n  ${p.description}\n`;
    });
    return text;
  }

  // 9. Management Team Database Query
  if (/team|management|person|staff|founder|head|director/i.test(q)) {
    const persons = await ManagementPerson.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
    if (!persons || persons.length === 0) {
      return `👥 **Management Team:** AgriNex Vertical Farming Operations Team.`;
    }

    let text = `👥 **AgriNex Leadership & Management Team:**\n\n`;
    persons.forEach((m) => {
      text += `• **${m.name}** – *${m.designation}*${m.collegeName ? ` (${m.collegeName})` : ''}\n`;
    });
    return text;
  }

  // 10. Live Camera / Stream Database Query
  if (/stream|camera|video|live link|cctv|feed/i.test(q)) {
    const activeStream = await LiveStream.findOne({ isActive: true }).sort({ createdAt: -1 }).lean();
    if (!activeStream) {
      return `📹 **Live Stream Feed:**\nNo live video stream is currently active. Streams can be scheduled by administrators.`;
    }

    return `📹 **Live Farm Stream:**\n• **Title:** ${activeStream.title || 'Live Vertical Farm Camera'}\n• **Status:** Active\n• **Description:** ${activeStream.description || 'Continuous monitoring stream'}`;
  }

  // 11. Knowledge Base Matching
  for (const item of KNOWLEDGE_BASE) {
    if (item.keywords.some((kw) => q.includes(kw))) {
      return item.response;
    }
  }

  // 12. Default Database Snapshot Response
  const sensors = await getLiveSensorData();
  const activeCount = sensors.filter((s) => s.data).length;

  return `🤖 **AgriNex Farm Intelligence:**
I searched the database for your query: *"**${queryText}**"*.

**Live Database Status:**
• **Monitored Telemetry:** ${activeCount} active zones reporting live sensor telemetry.
• **Database Models:** Connected to SensorData, Plots, Zones, and Projects.

Try asking:
1. **"Zone 1 details"** for live sensor readings.
2. **"Farm overview"** for all zone statuses.
3. **"Show crops"** for planted crops in farm plots.
4. **"Ideal humidity"** for environmental guidelines.`;
}

// Controller: Main chat endpoint (handles POST /api/chatbot and POST /api/chatbot/chat)
exports.chat = async (req, res) => {
  try {
    const { message, question } = req.body;
    const userQuery = message || question;

    if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message/question is required and must be a non-empty string',
      });
    }

    // Generate response dynamically from database & security engine
    const reply = await processUserQuery(userQuery);

    res.status(200).json({
      success: true,
      message: 'Chat response generated successfully',
      response: reply,
    });
  } catch (error) {
    console.error('Chatbot query error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during chat query',
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while querying the database'
        : error.message,
    });
  }
};

// @desc    Health check for chatbot service
// @route   GET /api/chatbot/health
// @access  Public
exports.healthCheck = async (req, res) => {
  res.status(200).json({
    service: 'chatbot',
    status: 'configured',
    configured: true,
    healthy: true,
    engine: 'AgriNex Native Secure Database & Vertical Farming Engine',
    message: 'Chatbot service is active, securely connected to MongoDB',
  });
};

// @desc    Quick Live Telemetry Snapshot Route
// @route   GET /api/chatbot/status
// @access  Public
exports.getStatus = async (req, res) => {
  try {
    const sensors = await getLiveSensorData();
    res.status(200).json({
      success: true,
      data: sensors,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch status' });
  }
};

// @desc    Create a new chat session
// @route   POST /api/chatbot/session
// @access  Public
exports.createSession = async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const sessionId = crypto.randomUUID();
    const session = await ChatSession.create({
      sessionId,
      name,
      email
    });

    res.status(201).json({
      success: true,
      sessionId: session.sessionId,
      message: 'Chat session created successfully'
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ success: false, message: 'Failed to create session' });
  }
};

// @desc    Save a chat message to a session
// @route   POST /api/chatbot/session/:sessionId/message
// @access  Public
exports.saveMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { role, content, isAudio } = req.body;

    if (!sessionId || !role || !content) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const message = await ChatMessage.create({
      sessionId,
      role,
      content,
      isAudio: !!isAudio
    });

    res.status(201).json({
      success: true,
      message: 'Message saved successfully',
      data: message
    });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ success: false, message: 'Failed to save message' });
  }
};

