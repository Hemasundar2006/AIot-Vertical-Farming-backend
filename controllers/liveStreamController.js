const LiveStream = require('../models/LiveStream');

// @desc    Set YouTube live link
// @route   POST /api/live/set-link
// @access  Public
exports.setLiveLink = async (req, res) => {
  try {
    const { youtubeLink, title, description } = req.body;

    // Validate required fields
    if (!youtubeLink) {
      return res.status(400).json({
        message: 'YouTube live link is required',
        error: 'Please provide a valid YouTube live URL',
      });
    }

    // Validate YouTube URL format
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeLink)) {
      return res.status(400).json({
        message: 'Invalid YouTube URL',
        error: 'Please provide a valid YouTube URL (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)',
      });
    }

    // Deactivate all existing active streams
    await LiveStream.updateMany({ isActive: true }, { isActive: false });

    // Create new live stream entry
    const liveStream = await LiveStream.create({
      youtubeLink,
      title: title || 'Live Stream',
      description: description || '',
      isActive: true,
    });

    res.status(201).json({
      message: 'YouTube live link set successfully',
      data: {
        id: liveStream._id,
        youtubeLink: liveStream.youtubeLink,
        title: liveStream.title,
        description: liveStream.description,
        isActive: liveStream.isActive,
        createdAt: liveStream.createdAt,
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

// @desc    Get current active YouTube live link
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
        youtubeLink: liveStream.youtubeLink,
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

