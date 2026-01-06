const mongoose = require('mongoose');

const liveStreamSchema = new mongoose.Schema(
  {
    youtubeLink: {
      type: String,
      required: [true, 'YouTube live link is required'],
      trim: true,
      validate: {
        validator: function(v) {
          // Validate YouTube URL format
          const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
          return youtubeRegex.test(v);
        },
        message: 'Please provide a valid YouTube URL',
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

