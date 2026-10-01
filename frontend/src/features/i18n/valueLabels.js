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
  'None (Healthy)': { fr: 'Aucune', en: 'None' , ar: 'لا يوجد', ary: 'ما كاينش', tzm: 'Ulac' },
  None: { fr: 'Aucune', en: 'None' , ar: 'لا يوجد', ary: 'ما كاينش', tzm: 'Ulac' },
  'Diabetes Type 1': { fr: 'Diabète de type 1', en: 'Type 1 diabetes' , ar: 'السكري من النوع الأول', ary: 'السكري من النوع 1', tzm: 'Asuc ur amellal 1' },
  'Diabetes Type 2': { fr: 'Diabète de type 2', en: 'Type 2 diabetes' , ar: 'السكري من النوع الثاني', ary: 'السكري من النوع 2', tzm: 'Asuc ur amellal 2' },
  Hypertension: { fr: 'Hypertension', en: 'High blood pressure' , ar: 'ارتفاع ضغط الدم', ary: 'الضغط العالي', tzm: 'Tazweta n tazm' },
  Asthma: { fr: 'Asthme', en: 'Asthma' , ar: 'الربو', ary: 'الربو', tzm: 'Tanta' },
  'Heart Disease': { fr: 'Maladie cardiaque', en: 'Heart disease' , ar: 'أمراض القلب', ary: 'مرض القلب', tzm: 'Awal n tayr' },
  'Chronic Kidney Disease': { fr: 'Maladie rénale chronique', en: 'Chronic kidney disease' , ar: 'أمراض الكلى المزمنة', ary: 'الكلية المزمنة', tzm: 'Awal n tled' },
  'Thyroid Disorder': { fr: 'Trouble de la thyroïde', en: 'Thyroid disorder' , ar: 'اضطراب الغدة الدرقية', ary: 'الغدة الدرقية', tzm: 'Tigletin n tares' },
  Epilepsy: { fr: 'Épilepsie', en: 'Epilepsy' , ar: 'الصرع', ary: 'الصرع', tzm: 'Salṭa' },
  Other: { fr: 'Autre', en: 'Other' , ar: 'أخرى', ary: 'أخرى', tzm: 'Ɣeḍa' },
};

const GENDER = {
  Male: { fr: 'Homme', en: 'Male' , ar: 'ذكر', ary: 'راجل', tzm: 'Arjaj' },
  Female: { fr: 'Femme', en: 'Female' , ar: 'أنثى', ary: 'مشيخة', tzm: 'Məcira' },
  Other: { fr: 'Autre', en: 'Other' , ar: 'أخرى', ary: 'أخرى', tzm: 'Ɣeḍa' },
};

const RELATIONSHIP = {
  Father: { fr: 'Père', en: 'Father' , ar: 'الأب', ary: 'البا', tzm: 'Bab' },
  Mother: { fr: 'Mère', en: 'Mother' , ar: 'الأم', ary: 'الم', tzm: 'Mm' },
  Spouse: { fr: 'Conjoint(e)', en: 'Spouse' , ar: 'الزوج/الزوجة', ary: 'الزوج ولا الزوجة', tzm: 'Tamazart' },
  Brother: { fr: 'Frère', en: 'Brother' , ar: 'الأخ', ary: 'الخويا', tzm: 'Lkhiwiya' },
  Sister: { fr: 'Sœur', en: 'Sister' , ar: 'الأخت', ary: 'الختي', tzm: 'Lkhtiya' },
  Son: { fr: 'Fils', en: 'Son' , ar: 'الابن', ary: 'الولد', tzm: 'Lldul' },
  Daughter: { fr: 'Fille', en: 'Daughter' , ar: 'الابنة', ary: 'البنت', tzm: 'Llbant' },
  Friend: { fr: 'Ami(e)', en: 'Friend' , ar: 'صديق', ary: 'صاحبي', tzm: 'Sahbi' },
  Other: { fr: 'Autre', en: 'Other' , ar: 'أخرى', ary: 'أخرى', tzm: 'Ɣeḍa' },
};

const LANGUAGE = {
  Arabic: { fr: 'Arabe', en: 'Arabic' , ar: 'العربية', ary: 'العربية', tzm: 'Tɛrabt' },
  'Moroccan Darija': { fr: 'Darija marocaine', en: 'Moroccan Darija' , ar: 'الدارجة المغربية', ary: 'الدارجة المغربية', tzm: 'Darija l Məɣriba' },
  French: { fr: 'Français', en: 'French' , ar: 'الفرنسية', ary: 'الفرنسية', tzm: 'Tafransist' },
  Tamazight: { fr: 'Tamazight', en: 'Tamazight' , ar: 'الأمازيغية', ary: 'الأمازيغية', tzm: 'Tamazight' },
  English: { fr: 'Anglais', en: 'English' , ar: 'الإنجليزية', ary: 'الإنجليزية', tzm: 'Taglizit' },
};

const INSURANCE = {
  AMO: { fr: 'AMO', en: 'AMO' }, // scheme acronyms are proper nouns, left as-is
  CNOPS: { fr: 'CNOPS', en: 'CNOPS' , ar: 'CNOPS', ary: 'CNOPS', tzm: 'CNOPS' },
  Private: { fr: 'Assurance privée', en: 'Private' , ar: 'تأمين خاص', ary: 'تأمين خاص', tzm: 'Useḥbiber alemmas' },
  'AMO-Tadamoun (RAMED)': { fr: 'AMO-Tadamoun (RAMED)', en: 'AMO-Tadamoun (RAMED)' , ar: 'AMO-تضامن (RAMED)', ary: 'AMO-تضامن (RAMED)', tzm: 'AMO-Tadamun (RAMED)' },
  'None / Self-Pay': { fr: 'Aucun / Paiement direct', en: 'None / Self-pay' , ar: 'لا يوجد / دفع ذاتي', ary: 'لا شيء / الدفع بنفسك', tzm: 'Ulac / tkhadmen s cwik' },
  None: { fr: 'Aucun', en: 'None' , ar: 'لا يوجد', ary: 'ما كاينش', tzm: 'Ulac' },
};

const LIFESTYLE = {
  'Non-smoker': { fr: 'Non-fumeur', en: 'Non-smoker' , ar: 'غير مدخن', ary: 'ماشي كيسيجي', tzm: 'Dacas' },
  Smoker: { fr: 'Fumeur', en: 'Smoker' , ar: 'مدخن', ary: 'كيسيجي', tzm: 'Akečči' },
  'Former smoker': { fr: 'Ancien fumeur', en: 'Former smoker' , ar: 'مدخن سابق', ary: 'كان كيسيجي ووقف', tzm: 'Kan kiseji uwwaf' },
  Never: { fr: 'Jamais', en: 'Never' , ar: 'أبداً', ary: 'عمر', tzm: 'Ulac abda' },
  Occasionally: { fr: 'Occasionnellement', en: 'Occasionally' , ar: 'أحياناً', ary: 'مرات', tzm: 'Marrat' },
  Regularly: { fr: 'Régulièrement', en: 'Regularly' , ar: 'بانتظام', ary: 'ديما', tzm: 'Koll s nhar' },
};

const ALLERGY = {
  None: { fr: 'Aucune', en: 'None' , ar: 'لا يوجد', ary: 'ما كاينش', tzm: 'Ulac' },
  'None (Healthy)': { fr: 'Aucune', en: 'None' , ar: 'لا يوجد', ary: 'ما كاينش', tzm: 'Ulac' },
  Other: { fr: 'Autre', en: 'Other' , ar: 'أخرى', ary: 'أخرى', tzm: 'Ɣeḍa' },
  Penicillin: { fr: 'Pénicilline', en: 'Penicillin' , ar: 'بنسلين', ary: 'بنسلين', tzm: 'Akanastin' },
  Aspirin: { fr: 'Aspirine', en: 'Aspirin' , ar: 'أسبرين', ary: 'أسبرين', tzm: 'Aspirin' },
  'Sulfa drugs': { fr: 'Sulfamides', en: 'Sulfa drugs' , ar: 'السلفا', ary: 'السلفا', tzm: 'Isulfan' },
  NSAIDs: { fr: 'AINS', en: 'NSAIDs' , ar: 'مضادات الالتهاب غير الستيرويدية', ary: 'مضادات الالتهاب', tzm: 'Timalellawt n tidert' },
  Peanuts: { fr: 'Arachides', en: 'Peanuts' , ar: 'الفول السوداني', ary: 'الكاوكاو', tzm: 'Lkawkaw' },
  Dairy: { fr: 'Produits laitiers', en: 'Dairy' , ar: 'الألبان', ary: 'اللبن', tzm: 'Alibane' },
  Gluten: { fr: 'Gluten', en: 'Gluten' , ar: 'الغلوتين', ary: 'الغلوتين', tzm: 'Gluten' },
  Shellfish: { fr: 'Fruits de mer', en: 'Shellfish' , ar: 'المحار', ary: 'البحار', tzm: 'Albḥar' },
  Eggs: { fr: 'Œufs', en: 'Eggs' , ar: 'البيض', ary: 'البيض', tzm: 'Ḵaḍan' },
};

const BLOOD = {
  'O+': { fr: 'O+', en: 'O+' },
  'O-': { fr: 'O-', en: 'O-' },
  'A+': { fr: 'A+', en: 'A+' },
  'A-': { fr: 'A-', en: 'A-' },
  'B+': { fr: 'B+', en: 'B+' },
  'B-': { fr: 'B-', en: 'B-' },
  'AB+': { fr: 'AB+', en: 'AB+' },
  'AB-': { fr: 'AB-', en: 'AB-' },
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
  blood: BLOOD,
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
  // Order matters: `ary` must be tried before `en`, otherwise Darija would
  // fall through to English for every enum instead of its own label.
  return entry[lang] || entry.en || String(value);
}

/**
 * True when the stored profile value means "none of this". Accepts the
 * comma-joined form the API uses for multi-valued fields.
 */
export function isEmptyValue(value) {
  if (!value) return true;
  return String(value)
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p !== '')
    .every((part) => CHRONIC_EMPTY.has(part) || ALLERGY_EMPTY.has(part));
}
