/**
 * Deterministic reply-language detection.
 *
 * The LLM prompts already say "reply in the language the patient used", but the
 * ambiguity has to be resolved BEFORE the model runs, otherwise it guesses:
 *
 *  - Tifinagh script  → Tamazight, unambiguous.
 *  - Arabic script    → the patient's profile variety. A patient whose profile
 *                       still holds the default ('Arabic') but who writes the
 *                       way Moroccans actually write gets Darija, because MSA is
 *                       the value nobody opts into by hand.
 *  - Latin script     → genuinely three-way (French / English / arabizi Darija),
 *                       so it is scored on marker words rather than guessed.
 *
 * Arabizi matters: on a Moroccan phone the Latin keyboard is the default, so
 * "mrid ana" (I am cold) is an everyday message. Classifying it as the profile
 * default replied in Modern Standard Arabic to a patient who does not read it.
 */
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const TIFINAGH_RE = /[\u2D30-\u2D7F\u2D80-\u2D96]/;

// High-signal Darija markers only. Words shared with French ("ma", "la", "dans",
// "sur") are deliberately excluded — they are what made naive detection
// misfire. Each entry below is Darija and not a French/English word.
const DARIJA_MARKERS = [
  'wach', 'wachk', 'kayn', 'makaynch', 'makanch', '3andek', '3andi', '3andna',
  'bghit', 'bghitk', 'mrida', 'mrid', 'mrad', 'mr', 'bzaaaf', 'bzaf', 'chwiya',
  'daba', 'ghda', 'kifach', 'lach', 'khal', '7it', '9bel', 'bsa7', 'nta', 'nti',
  'nti', 'dak', 'diha', 'hna', 'mn', '3la', 'dakshi', 'kifkif', 'zwit', 'mchit',
  'ghadi', 'mshi', 'kont', 'kaynk', 'semt', 'chhal', 'mrabet', 'toul', '9rib',
  'chno', 'khalia', 'sara7a', 'lkbir', 'sghir', 'wdek', 'zid', 'nfez', 'sme7',
  'bzid', 'mab9itch', 'wachkhab', 'dawiya', 'twal', 'chban', 'kayn chi',
  'mrk', 'zidni', '3tini', 'melli', 'kifmam', 'a3tini', 'mghrib', 'mrba7',
];

// French/English glue. A message carrying several of these and no Darija marker
// is treated as French/English rather than falling back to the profile.
const LATIN_EUROPEAN_RE =
  /\b(je|tu|il|elle|nous|vous|ils|elles|ai|as|est|suis|tres|mais|donc|avec|sans|pour|que|qui|quoi|comment|symptom[e]?|douleur|fievre|malade|medicament|allergi|aujourd|depuis|headache|fever|pain|medicine|doctor|hospital)\b/i;

// English is only distinguishable from French by its function words and by the
// spelling of the clinical terms ("headache" vs "mal de tête", "fever" vs
// "fièvre"), so both are scored. French keeps the tie when neither is present.
const ENGLISH_RE =
  /\b(i|me|my|mine|have|has|had|am|is|are|was|were|and|but|the|a|an|of|to|with|since|feel|felt|get|getting|still|very|too|also|about)\b/i;
const ENGLISH_CLINICAL_RE =
  /\b(headache|fever|chills|cough|sore|pain|hurts|hurting|nausea|dizzy|weak|tired|itch|rash|swelling|medication|medicine|allergic|breathing|chest|since yesterday|last night)\b/i;
const FRENCH_RE =
  /\b(je|j'|tu|il|elle|nous|vous|ils|elles|me|te|se|mon|ma|mes|ton|ta|tes|notre|votre|leurs|ai|as|est|suis|très|mais|donc|avec|sans|pour|que|qui|quoi|comment|ce|cette|des|les|une|un|du|de|au|aux|et|ou|ne|pas|plus|depuis|ressens|mal|fièvre|douleur|forte|faible|nausée|qui|ça|c est)\b/i;

function isLikelyEnglish(text) {
  return ENGLISH_CLINICAL_RE.test(text) || (ENGLISH_RE.test(text) && !FRENCH_RE.test(text));
}

function hasDarijaMarker(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return false;
  const hits = words.filter((w) => DARIJA_MARKERS.includes(w) || DARIJA_MARKERS.includes(`${w}a`));
  // One marker in a long message is a quoted French word ("j'ai mal, wach c'est
  // grave ?"). Require either two markers or a marker in a short message.
  return hits.length >= 2 || (hits.length === 1 && words.length <= 6);
}

function detectReplyLanguage(message, preferredLanguage) {
  const text = typeof message === 'string' ? message : '';
  if (!text.trim()) return 'French';
  if (TIFINAGH_RE.test(text)) return 'Tamazight';

  if (ARABIC_RE.test(text)) {
    // Unmistakable MSA wins even over a Darija profile: the patient wrote in
    // MSA, so they read MSA. Replying in Darija would be as unwelcome as the
    // reverse. Everything else Arabic-script → Darija unless the profile opted
    // into MSA, because 'Arabic' is the seeded default, not a real choice.
    if (isLikelyMsa(text)) return 'Arabic';
    if (preferredLanguage === 'Arabic' && /فصحى|فصحوي/.test(text)) return 'Arabic';
    return 'Moroccan Darija';
  }

  // Latin script: score the message instead of trusting the profile blindly.
  if (hasDarijaMarker(text)) return 'Moroccan Darija';
  if (isLikelyEnglish(text)) return 'English';
  if (LATIN_EUROPEAN_RE.test(text)) return 'French';
  if (preferredLanguage === 'English') return 'English';
  if (preferredLanguage === 'Moroccan Darija') return 'Moroccan Darija';
  if (preferredLanguage === 'Tamazight') return 'Tamazight';
  return 'French';
}

// MSA markers that Darija would not use. Darija writes "عندي صرش" / "kach
// ndir", MSA writes "لدي لا أستطيع التنفس" — the clinical register is the tell.
function isLikelyMsa(text) {
  return /لدي|أشعر|أستطيع|لا أستطيع|لا يمكنني|الطوارئ|حالة طبية/.test(text);
}

module.exports = { detectReplyLanguage };
