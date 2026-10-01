/**
 * Deterministic vital-red-flag detection.
 *
 * The safety gateway's classifier is a model: it can be rate-limited, time
 * out, return unparseable JSON, or be running against a stub, and in every one
 * of those cases a life-threatening message fell through to the normal triage
 * path and was answered like a headache. These phrases are not ambiguous in any
 * variety the product supports, so they are matched before the model runs.
 *
 * The list is deliberately narrow: only conditions where waiting for a model
 * round-trip is itself the hazard. Everything subtler stays with the classifier.
 *
 * Darija is written in Latin letters (arabizi) or Arabic script, and `9` stands
 * for غ, `7` for ح, `3` for ع, `9der` for تقدر, `mcha` for ما يمكن. Both
 * scripts appear, so both are listed.
 */

// [regex, reason]. Reasons reach the patient, so they stay short and actionable.
const VITAL_RED_FLAGS = [
  // ── Airway / breathing ──────────────────────────────────────────────────
  [/je\s+ne\s+respire\s+plus/i, 'Difficulté respiratoire sévère'],
  [/(difficult[ée]|impossible)\s+[àa]\s+respirer/i, 'Difficulté respiratoire'],
  [/respira(tion|toire)?\s+difficile/i, 'Difficulté respiratoire'],
  [/(shortness\s+of\s+breath|cannot\s+breathe|can'?t\s+breathe|trouble\s+breathing)/i, 'Difficulté respiratoire'],
  [/suffoc\w*|asphyx\w*|étouff\w*|etouff\w*|chok\w*|cyanose|blue\s+lips/i, 'Détresse respiratoire'],
  // Arabic script
  [/(صعوب[ةه]\s*(في\s*)?التنف[ّس])|(صعوب[ةه]\s*نفس)|(مستحيل\s*نفس)|(تضيق\s*نفس)/i, 'صعوبة في التنفس'],
  // Arabizi
  [/\b(nfes|nfs)\b\s*(ma|mgha|mat9a|machi|machit|khayb)/i, 'صعوبة في التنفس'],
  [/\b(ma|mgha|mat9a|machi|machit)\b[^.]{0,12}\b(nfes|nfs)\b/i, 'صعوبة في التنفس'],
  [/\b(mcha|mchi|mchit|m9der|kanef|kane9der|kane|msa7er|msayer)\b.{0,12}\b(nfes|nfs)\b/i, 'صعوبة في التنفس'],
  [/\b(nfes|nfs)\b.{0,12}\b(kanef|kane9der|mat9a)\b/i, 'صعوبة في التنفس'],
  [/\b(msa7er|msayer|msa7ra)\b.{0,12}\b(nfes|nfs)\b/i, 'صعوبة في التنفس'],

  // ── Chest pain / cardiac ────────────────────────────────────────────────
  [/(douleur|doulleur)\s+(au\s+|de\s+la\s+|dans\s+la\s+)?(thorax|thoracique|poitrine)/i, 'Douleur thoracique'],
  [/\b(thorax|thoracique|poitrine)\b/i, 'Douleur thoracique'],
  [/\b(chest\s+pain|pain\s+in\s+(the|my)\s+chest|pain\s+on\s+(the|my)\s+chest)\b/i, 'Douleur thoracique'],
  [/(tsadder|admer|wjed)\s+fi?\s*(sadr|dddar)/i, 'ألم في الصدر'],
  [/(ألم|الم|وجع)\s*(في|فال)?\s*(ال)?صدر/, 'ألم في الصدر'],

  // ── Loss of consciousness ───────────────────────────────────────────────
  [/(perte\s+de\s+connaissances?|suis\s+inconscient|inconscienc\w*|évanoui\w*|tombai\s+par\s+terre)/i, 'Perte de connaissance'],
  [/(unconscious|passed\s+out|blacked\s+out|faint\w*)/i, 'Perte de connaissance'],
  [/(فقدت\s+الوعي|فاقد\s+الوعي|لا\s+واعي|غايب\s+عن\s+الوعي)/, 'فقدت الوعي'],
  [/\b(mchiit|mchi9t|fchdit|fchd|fade9|fadit|ghayit|ghay9t)\b.{0,12}\b(dhakni|dhakniya)\b/i, 'فقدت الوعي'],

  // ── Severe bleeding ─────────────────────────────────────────────────────
  [/(h[ée]morrag\w*\s+(massive|sévère|severe|forte))|(saignement\s+(massif|abondant|fort|important))/i, 'Hémorragie massive'],
  [/(severe\s+bleeding|heavy\s+bleeding|bleeding\s+(heavily|severely|badly|a\s+lot))|(blood\s+everywhere)/i, 'Hémorragie massive'],
  [/(نزيف\s+غزير|نزيف\s+كبير|نزيف\s+شديد)/, 'نزيف غزير'],
  [/\b(nzif|nzef)\b\s*(bzaf|bza3|kbir|shdid)/i, 'نزيف غزير'],

  // ── Stroke / neurological ───────────────────────────────────────────────
  [/(paralysie|accident\s+vasculaire|visage\s+(tombe|paralys[ée])|parole\s+baveuse|faiblesse\s+d'un\s+c[ôo]t[ée])/i, "Suspicion d'AVC"],
  [/(stroke\s+symptoms?|face\s+drooping|slurred\s+speech|one\s+side\s+weak)/i, "Suspicion d'AVC"],
  [/(أعراض\s+جلطة|شلل\s+في\s+الوجه|صعوب[ةه]\s+في\s+الكلام)/, 'أعراض جلطة'],
  [/\b(fsayf|fsayef)\b.{0,12}\b(tmehtt|tmett)\b/i, 'أعراض جلطة'],

  // ── Seizure / anaphylaxis ───────────────────────────────────────────────
  [/(crise[s]?\s+(d'?)?[ée]pilept\w*|convulsions)/i, 'Crise convulsive'],
  [/(seizure|seizing|fitting|convulsing)/i, 'Crise convulsive'],
  [/(نوبة\s+تشنج|رعشة|تشنج)/, 'نوبة تشنجية'],
  [/\b(rqesse|rqess|teghegesta)\b.{0,12}\b(bzaf|bza3)\b/i, 'نوبة تشنجية'],
  [/(choc\s+anaphylactique|anaphyla\w*|gonflement\s+(rapide\s+)?de\s+la\s+gorge)/i, 'Choc anaphylactique'],

  // ── Severe burns / major trauma ────────────────────────────────────────
  [/(br[ûu]lure|brulure)\s+(grave|[ée]tendue|severe)/i, 'Brûlure grave'],
  [/(accident\s+(grave|de\s+la\s+route)|collision|chute\s+de\s+haut|heurt\w*\s+grave)/i, 'Traumatisme grave'],

  // ── Deliberate self-harm — always escalate, never triage ─────────────────
  [/(suicide|suicid\w*|me\s+tuer|tuer\s+moi|me\s+suicider|mettre\s+fin\s+[àa]\s+mes\s+jours)/i, 'Danger vital'],
  [/(kill\s+myself|end\s+my\s+life|take\s+my\s+own\s+life)/i, 'Danger vital'],
  [/(انتحار|قتل\s+نفسي|أراد\s+قتل\s+نفسه)/, 'خطر على الحياة'],
  [/\b(baghi|rabi)\b.{0,20}\b(n9tel|nqtol|rania|mr ana)\b/i, 'خطر على الحياة'],
  [/\b(n9tel|9tel|nqtol|qtol)\b.{0,12}\b(rasi|rass)\b/i, 'خطر على الحياة'],
];

/**
 * Negations that cancel a flag. Checked only in the text immediately before the
 * match, so "I have a headache but no chest pain" does not dial 150 while
 * "chest pain" on its own still does.
 *
 * Contractions are listed explicitly ("don't") because `\bnot\b` does not match
 * inside the token `don't`.
 */
const NEGATION_RE =
  /\b(pas|aucun|aucune|jamais|sans|nulle|nulle\s+part)\b|\bne\s+pas\b|ni\s+(pas|de)|sans\s+(douleur|mal)|n'|d'|don|doesn|does\s+not|didn|did\s+not|no|not|without|never|denies|refuse|n'est\s+pas/i;

const ARABIC_NEGATION = /(ما\s*كاينش|ما\s*كاين|ما\s*عندي|ما\s*عند|ليس\s+لدي|بدون|لا\s+يوجد)/;

function matchVitalRedFlag(text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();

  for (const [pattern, reason] of VITAL_RED_FLAGS) {
    const match = lower.match(pattern);
    if (!match) continue;

    // A negation shortly before the match cancels it.
    const start = Math.max(0, match.index - 45);
    const before = lower.slice(start, match.index);
    if (NEGATION_RE.test(before)) continue;
    if (ARABIC_NEGATION.test(before)) continue;

    return reason;
  }
  return null;
}

module.exports = { matchVitalRedFlag, VITAL_RED_FLAGS };
