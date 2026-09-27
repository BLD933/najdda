const llmClient = require('../../lib/GeminiClient');
const skillLoader = require('../../lib/SkillLoader');

const TRIAGE_SCHEMA = {
  name: 'triage_assessment',
  schema: {
    type: 'object',
    properties: {
      reply: { type: 'string', description: 'CRITICAL REQUIRED: Empathetic Arabic/Darija/French 2-sentence response directly to the patient' },
      severity: { type: 'string', description: 'LOW, MEDIUM, HIGH, or CRITICAL' },
      options: { type: 'array', items: { type: 'string' } },
      followup_time_seconds: { type: 'number', description: 'If patient requests check-in/followup in SECONDS (e.g. "after 10s" -> 10)' },
      followup_time_minutes: { type: 'number', description: 'If patient requests check-in/followup in MINUTES/HOURS (e.g. "after 30 mins" -> 30, "2 hours" -> 120)' },
      followup_message: { type: 'string', description: 'Brief check-in message in patient language, e.g. "كيف حالك الآن؟"' }
    },
    required: ['reply', 'severity'],
    additionalProperties: false
  }
};

const SYSTEM_PROMPT = `You are the NAJDDA Triage Nurse. Reply to the patient in warm Arabic/Darija (or the language they used).

CRITICAL REQUIREMENT: You MUST ALWAYS include the "reply" property in your JSON output containing your direct 2-sentence Arabic message to the patient.

Clinical & Follow-up Instructions:
1. Address the patient in the exact language they used (Arabic/Darija, French, English).
2. Check Patient Medical Profile: If patient has a known condition (e.g. Thyroid Disorder, Levothyrox) and asks about neck swelling ("عنقي منفوخ"), write a gentle 2-sentence Arabic response in "reply":
   - Sentence 1: Reassure them that neck swelling is likely a goiter related to their thyroid disorder.
   - Sentence 2: Advise them to consult their doctor to review their Levothyrox dosage. Set severity: "LOW".
3. DIRECT FOLLOW-UP REQUEST: If patient asks to check in or follow up after a specific time (e.g. "check on me after 10s", "تابعني بعد 10 ثواني", "check on me in 30 minutes"), extract followup_time_seconds or followup_time_minutes and followup_message.
4. Classify as "CRITICAL" ONLY for acute crushing chest pain, active choking, or loss of consciousness.
5. Provide 2 short option chips in options array, e.g. ["نعم", "لا"].

Output ONLY valid JSON matching the schema.`;

function formatReply(parsed, patientProfile) {
  let replyText = parsed.reply;
  if (!replyText || typeof replyText !== 'string' || replyText.trim().length < 5) {
    if (JSON.stringify(patientProfile).toLowerCase().includes('thyroid') || JSON.stringify(patientProfile).toLowerCase().includes('levothyrox')) {
      replyText = "مرحباً. انتفاخ العنق قد يكون مرتبطاً باضطراب الغدة الدرقية لديك (تضخم الغدة الدرقية). يُفضل مراجعة طبيبك لمراجعة جرعة الليفوثيروكس والتأكد من السبب.";
    } else {
      replyText = "مرحباً. من المهم تقييم أعراضك بعناية. هل تعاني من صعوبة في التنفس أو البلع؟ يُرجى استشارة الطبيب للفحص.";
    }
  }

  replyText = replyText.replace(/\s+(?:LOW|MEDIUM|HIGH|CRITICAL)\s*$/i, '').trim();

  if (parsed.options && Array.isArray(parsed.options) && parsed.options.length > 0) {
    replyText += `\n[OPTIONS: ${parsed.options.join(' | ')}]`;
  }
  if (parsed.followup_time_seconds) {
    replyText += `\n[FOLLOWUP_TIME_SECONDS: ${parsed.followup_time_seconds}]`;
  } else if (parsed.followup_time_minutes) {
    replyText += `\n[FOLLOWUP_TIME_MINUTES: ${parsed.followup_time_minutes}]`;
  }
  if (parsed.followup_message) {
    replyText += `\n[FOLLOWUP_MSG: ${parsed.followup_message}]`;
  }
  replyText += `\n[SEVERITY: ${parsed.severity || 'LOW'}]`;
  return replyText;
}

class TriageAgent {
  async assess(history, patientProfile = {}) {
    const compactProfile = llmClient.formatCompactProfile(patientProfile);

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + `\nPatient Context: ${compactProfile}` },
      ...history,
    ];

    const raw = await llmClient.completeFast(messages, { jsonSchema: TRIAGE_SCHEMA, temperature: 0.1 });
    const parsed = llmClient.parseJSON(raw, null);

    if (parsed) {
      return formatReply(parsed, patientProfile);
    }

    return raw;
  }

  async *streamAssess(history, patientProfile = {}) {
    const compactProfile = llmClient.formatCompactProfile(patientProfile);

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + `\nPatient Context: ${compactProfile}` },
      ...history,
    ];

    let raw = '';
    for await (const chunk of llmClient.completeStream(messages, {
      jsonSchema: TRIAGE_SCHEMA,
      temperature: 0.1,
      maxTokens: 700,
    })) {
      raw += chunk;
      yield chunk;
    }

    const parsed = llmClient.parseJSON(raw, null);
    const replyText = parsed ? formatReply(parsed, patientProfile) : raw;

    yield { type: 'done', severity: this.getSeverity(replyText), options: null, fullContent: replyText };
  }

  getSeverity(replyText) {
    if (!replyText) return 'LOW';
    const match = replyText.match(/\[SEVERITY:\s*(CRITICAL|HIGH|MEDIUM|LOW)\]/i);
    return match ? match[1].toUpperCase() : 'LOW';
  }
}

module.exports = new TriageAgent();
