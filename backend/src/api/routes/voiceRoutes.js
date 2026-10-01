const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const voiceTranscriptionService = require('../../core/services/VoiceTranscriptionService');
const { validateBase64Field, validateMime, AUDIO_MIMES } = require('../middlewares/uploadValidation');

router.post('/transcribe', authMiddleware, async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    const v = validateBase64Field(audioBase64, { fieldName: 'audioBase64' });
    if (v.error) {
      return res.status(v.status || 400).json({ message: v.error });
    }
    const mime = validateMime(mimeType, AUDIO_MIMES) || 'audio/webm';

    const result = await voiceTranscriptionService.transcribe(v.clean, mime);
    res.json(result);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Voice transcription error:', error.message);
    res.status(500).json({ message: 'Transcription failed' });
  }
});

module.exports = router;
