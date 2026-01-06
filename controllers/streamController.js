const ytdl = require('ytdl-core');

// Basic YouTube URL validation
const isValidYouTubeUrl = (url) => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host !== 'youtube.com' && host !== 'youtu.be') return false;
    return (
      parsed.searchParams.has('v') ||
      parsed.pathname.startsWith('/shorts/') ||
      (host === 'youtu.be' && parsed.pathname.length > 1)
    );
  } catch {
    return false;
  }
};

// Map upstream errors to user-friendly messages
const mapErrorMessage = (err) => {
  const msg = err?.message || '';
  if (/unavailable|private|removed/i.test(msg)) return 'Video unavailable';
  if (/Too Many Requests|429/i.test(msg)) return 'Rate limited by YouTube';
  return 'Failed to resolve stream';
};

// @desc    Proxy YouTube stream through this server
// @route   GET /api/stream/get-stream?url=<youtube_url>
// @access  Public
exports.getStream = async (req, res) => {
  const youtubeUrl = req.query.url;

  if (!isValidYouTubeUrl(youtubeUrl)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const info = await ytdl.getInfo(youtubeUrl);

    // Prefer HLS, fall back to best combined audio+video MP4
    const preferredFormat =
      info.formats.find(
        (f) => f.isHLS || f.mimeType?.includes('application/vnd.apple.mpegurl')
      ) ||
      ytdl.chooseFormat(info.formats, {
        quality: 'highest',
        filter: 'audioandvideo',
      });

    if (!preferredFormat?.url) {
      return res.status(404).json({ error: 'No playable stream found' });
    }

    res.setHeader('Content-Type', preferredFormat.mimeType || 'video/mp4');
    res.setHeader('Transfer-Encoding', 'chunked');

    const stream = ytdl.downloadFromInfo(info, {
      format: preferredFormat,
      filter: 'audioandvideo',
      highWaterMark: 1 << 25, // 32MB to smooth out buffering
    });

    stream.on('error', (err) => {
      console.error('ytdl stream error:', err);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Upstream stream failed' });
      } else {
        res.destroy(err);
      }
    });

    // Clean up if client disconnects
    req.on('close', () => stream.destroy());

    stream.pipe(res);
  } catch (err) {
    console.error('get-stream error:', err);
    res.status(500).json({ error: mapErrorMessage(err) });
  }
};

// @desc    Health check for stream service
// @route   GET /api/stream/healthz
// @access  Public
exports.healthz = (req, res) => {
  res.json({ ok: true });
};

