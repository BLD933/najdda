const MAX_DECODED_BYTES = 3 * 1024 * 1024; // 3 Mo décodés
const BASE64_RE = /^[A-Za-z0-9+/=\s]+$/;
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AUDIO_MIMES = new Set(['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/x-m4a']);

function validateBase64Field(value, { allowedMimes, fieldName }) {
  if (typeof value !== 'string' || value.length === 0) {
    return { error: `${fieldName} is required` };
  }
  const clean = value.includes(',') ? value.split(',').pop() : value;
  if (clean.length > 6 * 1024 * 1024 || !BASE64_RE.test(clean.slice(0, 1024 * 10))) {
    return { error: `${fieldName} is not valid base64` };
  }
  let byteLength = 0;
  try {
    byteLength = Buffer.byteLength(clean, 'base64');
  } catch {
    return { error: `${fieldName} is not valid base64` };
  }
  if (byteLength > MAX_DECODED_BYTES) {
    return { error: `${fieldName} exceeds 3MB`, status: 413 };
  }
  return { clean, byteLength };
}

function validateMime(mime, allowed) {
  if (!mime) return null;
  const base = String(mime).split(';')[0].trim().toLowerCase();
  if (!allowed.has(base)) return null;
  return base;
}

module.exports = {
  MAX_DECODED_BYTES,
  IMAGE_MIMES,
  AUDIO_MIMES,
  validateBase64Field,
  validateMime,
};
