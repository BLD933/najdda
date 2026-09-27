class VoiceTranscriptionService {
  constructor() {
    this.baseUrl = process.env.GROQ_AUDIO_URL || 'https://api.groq.com/openai/v1/audio/transcriptions';
    this.apiKey = process.env.LLM_API_KEY || '';
    this.model = process.env.WHISPER_MODEL || 'whisper-large-v3-turbo';
  }

  async transcribe(audioBase64, mimeType = 'audio/webm') {
    if (!audioBase64) throw new Error('Audio data is required');

    const buffer = Buffer.from(audioBase64, 'base64');
    const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp3') ? 'mp3' : 'webm';

    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType }), `audio.${ext}`);
    form.append('model', this.model);

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq transcription error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return { text: data.text, language: data.language || null, duration: data.duration || null };
  }
}

module.exports = new VoiceTranscriptionService();
