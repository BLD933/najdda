const LANG_MAP = {
  French: 'fr-FR',
  English: 'en-US',
  Arabic: 'ar-MA',
  'Moroccan Darija': 'ar-MA',
  // No dependable Tamazight STT/TTS voice exists on patient devices; ar-MA
  // (Darija) is the closest acoustic neighbour, French the fallback.
  Tamazight: 'ar-MA',
  // UI language codes (I18nContext) mapped defensively — ChatPage passes
  // profile enum values, but a UI code must never produce `undefined`.
  fr: 'fr-FR',
  en: 'en-US',
  ar: 'ar-MA',
  ary: 'ar-MA',
  tzm: 'ar-MA',
};

/**
 * Chrome populates `getVoices()` asynchronously: the first call returns an
 * empty array and the real list arrives with the `voiceschanged` event. Reading
 * once at import time therefore left `voice` null, and the reply was read in
 * whatever default voice the OS picked — an English or French voice reading
 * Arabic, which mispronounces medical terms. Caching the list and retrying
 * once on the event fixes that.
 */
let cachedVoices = [];
let voicesBound = false;

function getVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const list = window.speechSynthesis.getVoices();
  if (list.length > 0) {
    cachedVoices = list;
  } else if (!voicesBound) {
    voicesBound = true;
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      cachedVoices = window.speechSynthesis.getVoices();
    });
  }
  return cachedVoices;
}

function pickVoice(lang) {
  const voices = getVoices();
  if (voices.length === 0) return null;
  const mapped = LANG_MAP[lang] || lang;
  return (
    voices.find((v) => v.lang === mapped)
    || voices.find((v) => v.lang?.startsWith(mapped.split('-')[0]))
    || null
  );
}

// Agent replies can carry any bracketed machine tag, not only the three the
// list used to cover — reading "[SYNTHESIS] 12/13" aloud is noise the patient
// cannot act on.
function stripTags(text) {
  return String(text)
    .replace(/\[[A-Z_]+:[^\]]*\]/gi, '')
    .replace(/\[\/?[A-Z_]+\]/gi, '')
    .trim();
}

export function speak(text, lang = 'fr-FR') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const clean = stripTags(text);
  if (!clean) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = LANG_MAP[lang] || lang;
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export function stop() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function isSupported() {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}
