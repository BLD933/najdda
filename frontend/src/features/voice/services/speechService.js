const LANG_MAP = {
  French: 'fr-FR',
  English: 'en-US',
  Arabic: 'ar-MA',
  'Moroccan Darija': 'ar-MA',
  Tamazight: 'ar-MA',
};

function pickVoice(lang) {
  const voices = window.speechSynthesis.getVoices();
  const mapped = LANG_MAP[lang] || lang;
  return voices.find((v) => v.lang === mapped) || voices.find((v) => v.lang.startsWith(mapped.split('-')[0])) || null;
}

export function speak(text, lang = 'fr-FR') {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/\[SEVERITY:.*?\]/g, '').replace(/\[FOLLOWUP.*?\]/g, '').replace(/\[OPTIONS:.*?\]/g, '').trim());
  utterance.lang = LANG_MAP[lang] || lang;
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export function stop() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

export function isSupported() {
  return !!window.speechSynthesis;
}
