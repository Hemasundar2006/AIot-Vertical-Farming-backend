const LiveStream = require('../models/LiveStream');

// @desc    Set live stream URL
// @route   POST /api/live/set-link
// @access  Public
exports.setLiveLink = async (req, res) => {
  try {
    const { streamUrl, title, description } = req.body;

    // Validate required fields
    if (!streamUrl) {
      return res.status(400).json({
        message: 'Stream URL is required',
        error: 'Please provide a valid stream URL (e.g., HLS .m3u8 link)',
      });
    }

    // Basic stream URL format validation
    const urlRegex = /^(https?:\/\/)[^\s]+$/i;
    if (!urlRegex.test(streamUrl)) {
      return res.status(400).json({
        message: 'Invalid stream URL',
        error: 'Please provide a valid stream URL (e.g., https://example.com/stream.m3u8)',
      });
    }

    // Deactivate all existing active streams
    await LiveStream.updateMany({ isActive: true }, { isActive: false });

    // Create new live stream entry
    const liveStream = await LiveStream.create({
      streamUrl,
      title: title || 'Live Stream',
      description: description || '',
      isActive: true,
    });

    // Respond in the requested format
    res.status(201).json({
      data: {
        streamUrl: liveStream.streamUrl,
        title: liveStream.title,
        description: liveStream.description,
      },
    });
  } catch (error) {
    console.error('Set live link error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation error',
        error: errors.join(', '),
      });
    }

    res.status(500).json({
      message: 'Server error while setting live link',
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while processing your request'
        : error.message,
    });
  }
};

// @desc    Get current active live stream URL
// @route   GET /api/live/get-link
// @access  Public
exports.getLiveLink = async (req, res) => {
  try {
    // Find the most recent active live stream
    const liveStream = await LiveStream.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .select('-__v');

    if (!liveStream) {
      return res.status(404).json({
        message: 'No active live stream found',
        data: null,
      });
    }

    res.status(200).json({
      message: 'Live stream link retrieved successfully',
      data: {
        id: liveStream._id,
        streamUrl: liveStream.streamUrl,
        title: liveStream.title,
        description: liveStream.description,
        isActive: liveStream.isActive,
        createdAt: liveStream.createdAt,
        updatedAt: liveStream.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get live link error:', error);
    res.status(500).json({
      message: 'Server error while retrieving live link',
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while processing your request'
        : error.message,
    });
  }
};

// @desc    Get all live stream links (history)
// @route   GET /api/live/all
// @access  Public
exports.getAllLiveLinks = async (req, res) => {
  try {
    const liveStreams = await LiveStream.find()
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      message: 'Live stream links retrieved successfully',
      count: liveStreams.length,
      data: liveStreams,
    });
  } catch (error) {
    console.error('Get all live links error:', error);
    res.status(500).json({
      message: 'Server error while retrieving live links',
      error: process.env.NODE_ENV === 'production'
        ? 'An error occurred while processing your request'
        : error.message,
    });
  }
};

