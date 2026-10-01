/**
 * Offline LLM stub for local development and CI.
 *
 * With no API key, every agent call returned `401 invalid_api_key`, so the UI
 * could not be exercised end to end: the chat, the ecosystem pages and the
 * safety gateway all failed before reaching a single line of product code.
 * `LLM_MOCK=true` returns schema-shaped answers instead, which is enough to
 * walk the whole interface without a key.
 *
 * It is a stub, not a model: the text is fixed and the clinical content is not
 * real advice. The safety gateway deliberately still routes through the real
 * classifier path so emergency handling is exercised for real.
 */

const REPLY_LANG_MARKERS = {
  'Moroccan Darija': { open: 'واخا، فهمت:', close: ' (الرد بالدارجة).' },
  Arabic: { open: 'حسناً، فهمت:', close: ' (الرد بالعربية).' },
  Tamazight: { open: 'Ɛerf, fhemt:', close: ' (ased n Tamazight).' },
  English: { open: 'Understood:', close: ' (replying in English).' },
  French: { open: 'J\'ai compris :', close: ' (réponse en français).' },
};

// Extracts ReplyLang from the compact profile the agents embed, so the stub
// answers in the same language the real model would have been told to use.
function replyLangOf(messages) {
  const all = messages.map((m) => `${m?.content || ''}`).join(' ');
  const m = all.match(/ReplyLang:\s*([A-Za-z ]+)/);
  if (m) return m[1].trim();
  // Arabic-script prompt → the user is writing Arabic or Darija.
  if (/[\u0600-\u06FF]/.test(all)) return 'Arabic';
  return 'French';
}

function lastUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role !== 'user') continue;
    const c = messages[i].content;
    // Multimodal callers pass `content` as an array of parts
    // ([{ type: 'text', text }]), which stringifies to "[object Object]" and
    // made the stub echo that back to the patient.
    if (Array.isArray(c)) {
      return c.map((p) => (typeof p === 'string' ? p : p?.text || '')).join(' ').trim();
    }
    if (c && typeof c === 'object') return JSON.stringify(c);
    return String(c || '');
  }
  return '';
}

/**
 * Whether the caller expects JSON back.
 *
 * Two conventions are in use: some callers pass `jsonSchema`, others only
 * instruct the model in the system prompt ("Respond ONLY in valid JSON"). The
 * second group got prose from the stub, so PregnancySafetyService and
 * DrugSafetyService failed with "LLM did not return valid JSON" and answered 500
 * — a stub failure that looked like a product bug.
 */
function wantsJson(options, messages) {
  if (options && options.jsonSchema) return true;
  const system = messages
    .filter((m) => m?.role === 'system')
    .map((m) => String(m?.content || ''))
    .join(' ');
  return /respond only in (valid )?json|output format \(strict json|"status"\s*:/i.test(system);
}

function jsonFor(prompt, lang) {
  const marker = REPLY_LANG_MARKERS[lang] || REPLY_LANG_MARKERS.French;
  const text = `${marker.open} ${prompt.slice(0, 80)}${marker.close}`;
  // Keys cover the shapes the agents parse: triage, router, drug safety,
  // allergy, pregnancy, child, plus the generic recommendation shape.
  return JSON.stringify({
    reasoning: `mock: ${lang}`,
    agents: ['triage'],
    primaryDomain: 'triage',
    severity: 'LOW',
    reply: text,
    message: text,
    status: 'normal',
    risk: 'low',
    allergy_risk: 'low',
    likely_cause: 'Non déterminé (mode hors-ligne)',
    advice: [text, 'Repassez en mode réel pour un avis médical.'],
    consult: 'Consultez un médecin si les symptômes persistent.',
    when_to_act: 'Urgent si douleur thoracique ou difficulté à respirer.',
    dosage_guidance: '',
    differentials: [{ condition: 'Non déterminé (hors-ligne)', likelihood: 'low', rationale: 'mode mock' }],
    suggestedExams: [],
    redFlags: [],
    notes: text,
    requires_followup: false,
    followup_time_minutes: null,
    followup_message: null,
    options: null,
  });
}

function textFor(prompt, lang) {
  const marker = REPLY_LANG_MARKERS[lang] || REPLY_LANG_MARKERS.French;
  return `${marker.open} ${prompt.slice(0, 160)}${marker.close} [SEVERITY:LOW]`;
}

async function mockComplete(messages, options = {}) {
  const lang = replyLangOf(messages);
  const prompt = lastUserText(messages);
  // Small delay so loading states are actually visible while developing.
  await new Promise((r) => setTimeout(r, 60));
  return wantsJson(options, messages) ? jsonFor(prompt, lang) : textFor(prompt, lang);
}

async function* mockCompleteStream(messages, options = {}) {
  const full = await mockComplete(messages, options);
  const match = full.match(/\{[\s\S]*\}/);
  // Stream the raw JSON the same way a real model would, so the SSE path and
  // the TriageAgent parser are both exercised.
  const payload = match ? match[0] : full;
  for (let i = 0; i < payload.length; i += 40) {
    yield payload.slice(i, i + 40);
  }
}

module.exports = { mockComplete, mockCompleteStream, isMock: () => process.env.LLM_MOCK === 'true' };
