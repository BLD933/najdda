const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const voiceTranscriptionService = require('../../core/services/VoiceTranscriptionService');

router.post('/transcribe', authMiddleware, async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ message: 'Audio data is required' });
    }

    const result = await voiceTranscriptionService.transcribe(audioBase64, mimeType);
    res.json(result);
  } catch (error) {
    console.error('Voice transcription error:', error);
    res.status(500).json({ message: error.message || 'Transcription failed' });
  }
});

module.exports = router;
