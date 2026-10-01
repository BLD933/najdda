const profileRepository = require('../../infra/repositories/ProfileRepository');
const chatPersistenceService = require('../../core/services/ChatPersistenceService');
const llmClient = require('../../core/lib/GeminiClient');
const { matchVitalRedFlag } = require('../../core/lib/redFlags');

// ─── SAFETY GATEWAY CONFIGURATION ───────────────────────────────────────────
const TRIAGE_TIMEOUT_MS = 8000; // 8-second fail-safe timer for local Ollama execution
const TRIAGE_FAST_MODEL = process.env.LLM_MODEL_FAST || 'qwen/qwen3.8-27b';

/**
 * CONTEXT-AWARE SYSTEM PROMPT for the Gemini safety gateway.
 * Evaluates vital danger taking into account the patient's known chronic conditions & medications.
 */
const TRIAGE_SYSTEM_PROMPT = `You are a medical emergency classifier. Respond ONLY in valid JSON matching {"danger_vital": boolean, "raison": "string"}.

CRITICAL CONTEXT RULE:
Check Patient Profile. If a symptom (such as neck swelling "عنقي منفوخ", joint pain, or fatigue) is an expected symptom of their pre-existing condition (e.g., Thyroid Disorder, Goiter, Levothyrox) or regular medication, classify as danger_vital: false.

Classify as DANGER (danger_vital: true) ONLY for acute life-threatening events:
- Severe chest pain, tightness, pressure, or pain radiating to arm/jaw
- Acute choking, inability to breathe, suffocation, severe respiratory distress
- Loss of consciousness, fainting, unresponsive, collapsing
- Massive bleeding, severe trauma, active seizure
- Acute anaphylactic shock with sudden tongue/airway closure (when patient has no known thyroid condition)

Do NOT classify as DANGER for:
- Neck swelling ("عنقي منفوخ") in a patient with a known Thyroid Disorder / Levothyrox (danger_vital: false)
- Mild cold, runny nose, headache, minor rash, sore throat
- Routine medication questions`;

const DANGER_DETECTION_SCHEMA = {
  name: 'vital_danger_classification',
  schema: {
    type: 'object',
    properties: {
      danger_vital: { type: 'boolean', description: 'true if the patient is in vital danger or if unsure' },
      raison: { type: 'string', description: 'Brief reason for the classification in the patient language' },
    },
    required: ['danger_vital', 'raison'],
    additionalProperties: false,
  },
};

// ─── EMERGENCY NUMBER LOOKUP ─────────────────────────────────────────────────
const COUNTRY_EMERGENCY_NUMBERS = {
  'Morocco': '150',
  'France': '15',
  'Algeria': '14',
  'Tunisia': '190',
  'United States': '911',
  'USA': '911',
  'Canada': '911',
  'United Kingdom': '999',
  'UK': '999',
  'Australia': '000',
  'Spain': '112',
  'Italy': '112',
  'Germany': '112',
  'Belgium': '112',
  'Switzerland': '144',
};

const getEmergencyNumber = (country) => {
  if (!country) return '112';
  if (COUNTRY_EMERGENCY_NUMBERS[country]) return COUNTRY_EMERGENCY_NUMBERS[country];
  const normalizedCountry = country.toLowerCase().trim();
  for (const [key, value] of Object.entries(COUNTRY_EMERGENCY_NUMBERS)) {
    if (key.toLowerCase() === normalizedCountry) return value;
  }
  return '112';
};

// ─── GEMMA E2B SAFETY GATEWAY CALL ──────────────────────────────────────────
/**
 * Calls the Gemini fast model with patient profile context to classify vital danger.
 */
async function callVitalDangerClassifier(message, profile = {}) {
  const compactProfile = llmClient.formatCompactProfile(profile);

  // Retry on rate limits: without this, a 429 falls through to the fail-safe
  // below, which reports every message as a life-threatening emergency.
  const raw = await llmClient.withRateLimitRetry(() =>
    llmClient.completeFast(
      [
        { role: 'system', content: TRIAGE_SYSTEM_PROMPT },
        { role: 'user', content: `Patient Context: ${compactProfile}\nPatient message: "${message}"` },
      ],
      {
        model: TRIAGE_FAST_MODEL,
        // Two short fields only; keep the cap tight to protect rate limits.
        maxTokens: 400,
        temperature: 0.0, // Zero temperature = maximum determinism
        jsonSchema: DANGER_DETECTION_SCHEMA,
      }
    )
  );

  return llmClient.parseJSON(raw, { danger_vital: false, raison: 'Parse fallback - needs review', needsReview: true });
}

// ─── EMERGENCY MIDDLEWARE ────────────────────────────────────────────────────
/**
 * Normalises the emergency contacts into an array.
 *
 * The profile stores JSONB, but older rows hold a JSON string rather than an
 * array, and a single contact used to be sent under the object key
 * `emergencyContact` while the workflow read `emergencyContacts`. A patient with
 * one contact therefore produced a WhatsApp send with no recipient.
 */
function asContactArray(raw) {
  let value = raw;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return []; }
  }
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

const WEBHOOK_TIMEOUT_MS = 5000;
const WEBHOOK_ATTEMPTS = 2;

/**
 * Posts the alert to the n8n webhook without ever being awaited by the request.
 *
 * Returns immediately. Retries once on a network error or 5xx, because a missed
 * alert means a family member is not called; a 4xx is not retried because it
 * will keep failing. Failures are logged and swallowed — the emergency response
 * has already been sent.
 */
function notifyEmergencyWorkflow(payload) {
  const url = process.env.N8N_EMERGENCY_WEBHOOK_URL;
  if (!url) return;

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.N8N_WEBHOOK_SECRET) headers['x-n8n-secret'] = process.env.N8N_WEBHOOK_SECRET;
  const body = JSON.stringify(payload);

  const attempt = async (n) => {
    const controller = new AbortController();
    // No timeout meant a hanging n8n left the fetch pending forever, and one
    // leaked request per emergency.
    const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
      if (res.status >= 500 && n < WEBHOOK_ATTEMPTS) {
        console.warn(`n8n webhook returned ${res.status}, retrying`);
        return attempt(n + 1);
      }
      if (!res.ok) console.error(`n8n webhook rejected the alert: ${res.status}`);
      return res.ok;
    } catch (err) {
      if (n < WEBHOOK_ATTEMPTS) {
        console.warn(`n8n webhook attempt ${n} failed (${err.message}), retrying`);
        return attempt(n + 1);
      }
      console.error(`n8n webhook unreachable after ${n} attempts: ${err.message}`);
      return false;
    } finally {
      clearTimeout(timer);
    }
  };

  // `catch` guards against a throw escaping into an unhandled rejection, which
  // would take the process down over a failed alert.
  attempt(1).catch((err) => console.error('n8n webhook error:', err.message));
}

/**
 * Builds and sends the emergency response, persisting the exchange and firing
 * the n8n workflow. Shared by the deterministic pre-filter and the classifier so
 * both paths produce byte-identical safety copy and persist identically.
 */
async function respondEmergency(req, res, profile, raison, textToClassify, source) {
  const emergencyNumber = getEmergencyNumber(profile?.country);

  const emergencyResult = {
    isEmergency: true,
    emergencyNumber,
    status: 'danger',
    risk: 'high',
    raison,
    advice: [
      `Appelez immédiatement les secours (${emergencyNumber})`,
      'Ne restez pas seul.',
      "Si la personne est inconsciente, placez-la en position latérale de sécurité (PLS) si possible.",
    ],
    consult: `Appelez le ${emergencyNumber} (Urgences)`,
  };

  const chatTypeByPath = {
    '/api/chat': 'triage',
    '/api/pregnancy': 'pregnancy',
    '/api/allergy': 'allergy',
    '/api/children': 'children',
    '/api/medications': 'medications',
    '/api/orchestrator': 'orchestrator',
  };
  const chatType = chatTypeByPath[req.baseUrl];
  if (chatType && req.user?.id) {
    await chatPersistenceService.recordExchange({
      userId: req.user.id,
      chatType,
      message: textToClassify,
      result: emergencyResult,
    });
  }

  // Fire n8n emergency workflow. Detached from the response on purpose: the
  // patient gets their number first, and a slow or dead webhook must never sit
  // between them and the 150 call.
  notifyEmergencyWorkflow({
    isEmergency: true,
    source,
    userId: req.user?.id,
    message: textToClassify,
    location: { lat: profile.latitude, lng: profile.longitude },
    emergencyContacts: asContactArray(profile.emergencyContacts),
    medicalProfile: {
      allergies: profile.drugAllergies,
      conditions: profile.chronicDiseases,
      bloodType: profile.bloodType,
    },
  });

  return res.status(200).json(emergencyResult);
}

const emergencyMiddleware = async (req, res, next) => {
  try {
    const { message, symptoms, medication, food, textMessage } = req.body || {};
    const textToClassify = message || textMessage || [symptoms, medication, food].filter(Boolean).join(' | ');

    if (!textToClassify) {
      return next();
    }

    // Lookup user profile to provide context to the safety gateway
    let profile = req.user?.profile || {};
    if (!profile.chronicDiseases && req.user && req.user.id) {
      try {
        profile = (await profileRepository.findByUserId(req.user.id)) || profile;
      } catch (err) {
        console.warn('Profile lookup warning in emergency middleware:', err.message);
      }
    }

    console.log(`🛡️ [Safety Gateway Input] User: ${req.user?.id || 'Guest'} | len: ${String(textToClassify).length}`);

    // ── DETERMINISTIC PRE-FILTER (runs before any model) ───────────────
    // Vital danger used to be decided by the classifier alone. A rate limit, a
    // parse failure, a degraded provider - or a stub - could then let
    // "douleur thoracique intense et je respire plus" through as an ordinary
    // triage reply. These phrases are unambiguous in every variety the product
    // supports, so they short-circuit to the emergency response and the model is
    // only asked about the cases a keyword list cannot settle.
    const redFlag = matchVitalRedFlag(textToClassify);
    if (redFlag) {
      console.log(`\u{1F6A8} VITAL RED FLAG (deterministic): ${redFlag}`);
      return respondEmergency(req, res, profile, redFlag, textToClassify, 'keyword');
    }

    const triageResult = await Promise.race([
      callVitalDangerClassifier(textToClassify, profile),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Triage classifier timeout')), 2000)
      ),
    ]).catch((err) => {
      console.warn(`⚠️ [SAFETY GATEWAY DEGRADED] ${err.message} → passage au contrôleur normal`);
      return { danger_vital: false, raison: `Classifier indisponible: ${err.message}`, degraded: true, needsReview: true };
    });

    console.log(`🛡️ [Safety Gateway] danger_vital=${triageResult.danger_vital} — ${triageResult.raison}`);

    if (triageResult.degraded) {
      req.safetyDegraded = true;
      return next();
    }

    if (triageResult.danger_vital) {
      console.log('🚨 EMERGENCY DETECTED by safety gateway:', triageResult.raison);
      return respondEmergency(req, res, profile, triageResult.raison, textToClassify, 'classifier');
    }

    // No vital danger — continue to regular controller (LangGraph + Gemini)
    next();
  } catch (error) {
    console.error('Emergency Middleware Error:', error);
    next();
  }
};

module.exports = {
  emergencyMiddleware,
  getEmergencyNumber,
  respondEmergency,
  notifyEmergencyWorkflow,
  asContactArray,
};
