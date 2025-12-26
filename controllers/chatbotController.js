// @desc    Chat with Gemini AI chatbot
// @route   POST /api/chatbot
// @access  Public (or can be protected if needed)

exports.chat = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        message: 'Message is required and must be a non-empty string',
      });
    }

    // Check if Gemini API key is configured
    if (!process.env.VITE_GEMINI_API_KEY) {
      console.error('VITE_GEMINI_API_KEY is not configured');
      return res.status(500).json({
        message: 'Chatbot service is not configured',
        error: 'VITE_GEMINI_API_KEY is not set. Please configure it in environment variables.',
      });
    }
    // Prepare the request to Google Gemini API
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`;

    // Build conversation context
    const contents = [];

    // Add conversation history if provided
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      conversationHistory.forEach((item) => {
        if (item.role === 'user' && item.parts) {
          contents.push({
            role: 'user',
            parts: [{ text: item.parts }],
          });
        } else if (item.role === 'model' && item.parts) {
          contents.push({
            role: 'model',
            parts: [{ text: item.parts }],
          });
        }
      });
    }

    // Add system context for vertical farming
    const systemPrompt = `You are an AI assistant specialized in vertical farming and agriculture. 
    Provide helpful, accurate information about:
    - Vertical farming techniques
    - Crop management
    - Sensor data interpretation (soil moisture, temperature, humidity, air quality, light)
    - Zone management for vertical farms
    - Troubleshooting common farming issues
    - Best practices for sustainable agriculture
    
    Be concise, practical, and helpful.`;

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Prepare the request body
    const requestBody = {
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    };

    // Make request to Gemini API
    const response = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', response.status, errorData);
      
      if (response.status === 401 || response.status === 403) {
        return res.status(500).json({
          message: 'Chatbot service authentication failed',
          error: 'Invalid or expired API key',
        });
      }

      return res.status(response.status || 500).json({
        message: 'Chatbot service error',
        error: errorData.error?.message || 'Failed to get response from AI',
      });
    }

    const data = await response.json();

    // Extract the response text
    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0]
    ) {
      const aiResponse = data.candidates[0].content.parts[0].text;

      res.status(200).json({
        message: 'Chat response generated successfully',
        response: aiResponse,
        usage: data.usageMetadata || null,
      });
    } else {
      console.error('Unexpected Gemini API response structure:', data);
      return res.status(500).json({
        message: 'Chatbot service error',
        error: 'Unexpected response format from AI service',
      });
    }
  } catch (error) {
    console.error('Chatbot error:', error);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      message: 'Server error during chat',
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while processing your request'
        : error.message,
    });
  }
};

// @desc    Health check for chatbot service
// @route   GET /api/chatbot/health
// @access  Public
exports.healthCheck = (req, res) => {
  const isConfigured = !!process.env.VITE_GEMINI_API_KEY;

  res.status(200).json({
    service: 'chatbot',
    status: isConfigured ? 'configured' : 'not_configured',
    message: isConfigured
      ? 'Chatbot service is ready'
      : 'VITE_GEMINI_API_KEY is not set',
  });
};

