const profileRepository = require('../../infra/repositories/ProfileRepository');
const chatPersistenceService = require('../../core/services/ChatPersistenceService');
const llmClient = require('../../core/lib/GeminiClient');

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

  return llmClient.parseJSON(raw, { danger_vital: true, raison: 'Parse fallback' });
}

// ─── EMERGENCY MIDDLEWARE ────────────────────────────────────────────────────
const emergencyMiddleware = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message) {
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

    console.log(`🛡️ [Safety Gateway Input] User: ${req.user?.email || 'Guest'} | Msg: "${message}"`);
    console.log(`🛡️ [Safety Gateway Profile] Chronic: ${profile.chronicDiseases || 'None'} | Meds: ${JSON.stringify(profile.medications || [])}`);

    // ── GEMMA E2B SAFETY GATEWAY (with 2-second fail-safe) ───────────────
    const triageResult = await Promise.race([
      callVitalDangerClassifier(message, profile),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Triage classifier timeout')), 2000)
      ),
    ]).catch((err) => {
      console.warn(`⚠️ [SAFETY GATEWAY FAIL-SAFE] ${err.message} → defaulting to danger_vital: true`);
      return { danger_vital: true, raison: `System fail-safe triggered: ${err.message}` };
    });

    console.log(`🛡️ [Safety Gateway] danger_vital=${triageResult.danger_vital} — ${triageResult.raison}`);

    if (triageResult.danger_vital) {
      console.log('🚨 EMERGENCY DETECTED by safety gateway:', triageResult.raison);

      const emergencyNumber = getEmergencyNumber(profile?.country);

      const emergencyResult = {
        isEmergency: true,
        emergencyNumber,
        status: 'danger',
        risk: 'high',
        raison: triageResult.raison,
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
          message,
          result: emergencyResult,
        });
      }

      // Fire n8n emergency workflow (non-blocking)
      if (process.env.N8N_EMERGENCY_WEBHOOK_URL) {
        fetch(process.env.N8N_EMERGENCY_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isEmergency: true,
            userId: req.user?.id,
            message,
            location: {
              lat: profile.latitude,
              lng: profile.longitude,
            },
            emergencyContact: profile.emergencyContacts?.[0] || {},
            medicalProfile: {
              allergies: profile.drugAllergies,
              conditions: profile.chronicDiseases,
              bloodType: profile.bloodType,
            },
          }),
        }).catch((err) => console.error('n8n webhook error:', err.message));
      }

      return res.status(200).json(emergencyResult);
    }

    // No vital danger — continue to regular controller (LangGraph + Gemini)
    next();
  } catch (error) {
    console.error('Emergency Middleware Error:', error);
    next();
  }
};

module.exports = { emergencyMiddleware, getEmergencyNumber };
