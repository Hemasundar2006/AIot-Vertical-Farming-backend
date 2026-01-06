const mongoose = require('mongoose');

const liveStreamSchema = new mongoose.Schema(
  {
    // Direct stream URL (e.g. HLS .m3u8 or MP4 URL)
    streamUrl: {
      type: String,
      required: [true, 'Stream URL is required'],
      trim: true,
      validate: {
        validator: function (v) {
          // Basic HTTP/HTTPS URL validation
          const urlRegex = /^(https?:\/\/)[^\s]+$/i;
          return urlRegex.test(v);
        },
        message: 'Please provide a valid stream URL (e.g. https://example.com/stream.m3u8)',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Index for active streams
liveStreamSchema.index({ isActive: 1, createdAt: -1 });

const LiveStream = mongoose.model('LiveStream', liveStreamSchema);

module.exports = LiveStream;

