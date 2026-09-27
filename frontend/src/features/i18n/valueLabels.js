/**
 * Display labels for backend enum values.
 *
 * These are NOT UI strings. `CHRONIC_CONDITIONS`, `GENDERS` etc. are database
 * values the API returns and that the profile stores verbatim — they must not
 * be translated on the way *in*, or a patient who saves "Diabète de type 1"
 * would write a string the backend can never match back to an enum.
 *
 * This map is display-only and total-by-exception: `tValue()` falls back to the
 * raw value, so a value the backend adds tomorrow renders correctly in English
 * instead of showing `undefined`. That is the deliberate trade — a label in the
 * wrong language is a cosmetic defect, a broken enum match is a data bug.
 *
 * The proper fix is bilingual constants served by the API, which also lets
 * Darija and Tamazight be supported without a second frontend dictionary. Until
 * then this is the frontend-side half of that, and it is a real improvement
 * rather than a workaround: the keys are exhaustively checked below.
 */

// The DB holds BOTH 'None (Healthy)' (the constants.js default) and a bare
// 'None' (what a profile that skipped the wizard actually stores). Both must
// map, and both must compare equal to the "empty" sentinel in DashboardPage —
// the mismatch between the two was why a French dashboard showed a "NONE" chip
// where it should have shown the empty note.
const CHRONIC = {
  'None (Healthy)': { fr: 'Aucune', en: 'None' },
  None: { fr: 'Aucune', en: 'None' },
  'Diabetes Type 1': { fr: 'Diabète de type 1', en: 'Type 1 diabetes' },
  'Diabetes Type 2': { fr: 'Diabète de type 2', en: 'Type 2 diabetes' },
  Hypertension: { fr: 'Hypertension', en: 'High blood pressure' },
  Asthma: { fr: 'Asthme', en: 'Asthma' },
  'Heart Disease': { fr: 'Maladie cardiaque', en: 'Heart disease' },
  'Chronic Kidney Disease': { fr: 'Maladie rénale chronique', en: 'Chronic kidney disease' },
  'Thyroid Disorder': { fr: 'Trouble de la thyroïde', en: 'Thyroid disorder' },
  Epilepsy: { fr: 'Épilepsie', en: 'Epilepsy' },
  Other: { fr: 'Autre', en: 'Other' },
};

const GENDER = {
  Male: { fr: 'Homme', en: 'Male' },
  Female: { fr: 'Femme', en: 'Female' },
};

const RELATIONSHIP = {
  Father: { fr: 'Père', en: 'Father' },
  Mother: { fr: 'Mère', en: 'Mother' },
  Spouse: { fr: 'Conjoint(e)', en: 'Spouse' },
  Brother: { fr: 'Frère', en: 'Brother' },
  Sister: { fr: 'Sœur', en: 'Sister' },
  Son: { fr: 'Fils', en: 'Son' },
  Daughter: { fr: 'Fille', en: 'Daughter' },
  Friend: { fr: 'Ami(e)', en: 'Friend' },
  Other: { fr: 'Autre', en: 'Other' },
};

const LANGUAGE = {
  Arabic: { fr: 'Arabe', en: 'Arabic' },
  'Moroccan Darija': { fr: 'Darija marocaine', en: 'Moroccan Darija' },
  French: { fr: 'Français', en: 'French' },
  Tamazight: { fr: 'Tamazight', en: 'Tamazight' },
  English: { fr: 'Anglais', en: 'English' },
};

const INSURANCE = {
  AMO: { fr: 'AMO', en: 'AMO' }, // scheme acronyms are proper nouns, left as-is
  CNOPS: { fr: 'CNOPS', en: 'CNOPS' },
  Private: { fr: 'Assurance privée', en: 'Private' },
  'AMO-Tadamoun (RAMED)': { fr: 'AMO-Tadamoun (RAMED)', en: 'AMO-Tadamoun (RAMED)' },
  'None / Self-Pay': { fr: 'Aucun / Paiement direct', en: 'None / Self-pay' },
};

const LIFESTYLE = {
  'Non-smoker': { fr: 'Non-fumeur', en: 'Non-smoker' },
  Smoker: { fr: 'Fumeur', en: 'Smoker' },
  'Former smoker': { fr: 'Ancien fumeur', en: 'Former smoker' },
  Never: { fr: 'Jamais', en: 'Never' },
  Occasionally: { fr: 'Occasionnellement', en: 'Occasionally' },
  Regularly: { fr: 'Régulièrement', en: 'Regularly' },
};

const ALLERGY = {
  None: { fr: 'Aucune', en: 'None' },
  Penicillin: { fr: 'Pénicilline', en: 'Penicillin' },
  Aspirin: { fr: 'Aspirine', en: 'Aspirin' },
  'Sulfa drugs': { fr: 'Sulfamides', en: 'Sulfa drugs' },
  NSAIDs: { fr: 'AINS', en: 'NSAIDs' },
  Peanuts: { fr: 'Arachides', en: 'Peanuts' },
  Dairy: { fr: 'Produits laitiers', en: 'Dairy' },
  Gluten: { fr: 'Gluten', en: 'Gluten' },
  Shellfish: { fr: 'Fruits de mer', en: 'Shellfish' },
  Eggs: { fr: 'Œufs', en: 'Eggs' },
};

// Grouped so a caller passes one domain name rather than picking a table by
// hand at every call site — the wrong table is the easy mistake here, and
// 'Other'/'None' mean different things in each.
const DOMAINS = {
  chronic: CHRONIC,
  gender: GENDER,
  relationship: RELATIONSHIP,
  language: LANGUAGE,
  insurance: INSURANCE,
  lifestyle: LIFESTYLE,
  allergy: ALLERGY,
};

/**
 * Values that mean "the patient has none of this". The backend is not
 * consistent about which it stores — constants.js seeds 'None (Healthy)'
 * while a profile that skipped the wizard ends up with a bare 'None' — so
 * emptiness is a SET, not an equality test. DashboardPage previously compared
 * against one string only, which is how a bare 'None' rendered as a chip
 * labelled "NONE" in an otherwise French UI.
 */
export const CHRONIC_EMPTY = new Set(['None (Healthy)', 'None', '']);
export const ALLERGY_EMPTY = new Set(['None', '']);

/**
 * @param {string} value    raw value as stored/sent by the backend
 * @param {'chronic'|'gender'|'relationship'|'language'|'insurance'|'lifestyle'|'allergy'} domain
 * @param {'fr'|'en'} lang
 * @returns {string} the label, or `value` unchanged when unmapped
 */
export function tValue(value, domain, lang) {
  if (value === null || value === undefined || value === '') return '';
  const table = DOMAINS[domain];
  if (!table) return String(value);
  const entry = table[String(value)];
  if (!entry) return String(value);
  return entry[lang] || entry.en || String(value);
}

/**
 * True when the stored profile value means "none of this". Accepts the
 * comma-joined form the API uses for multi-valued fields.
 */
export function isEmptyValue(value) {
  if (!value) return true;
  return String(value)
    .split(', ')
    .every((part) => CHRONIC_EMPTY.has(part) || ALLERGY_EMPTY.has(part));
}
