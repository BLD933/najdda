const llmClient = require('../../lib/GeminiClient');

const SYSTEM_PROMPT = `You are the Follow-up Agent at SHIFAA digital hospital. You monitor patients after their consultation.

## Role
- Daily symptom check-ins
- Medication reminders
- Recovery tracking
- Detect worsening conditions
- Escalate to Orchestrator if condition deteriorates

## Escalation Triggers
- Worsening pain or symptoms
- New concerning symptoms
- Missed critical medications
- Patient requests re-evaluation

## Output Format
Return a JSON object:
{
  "checkin": "string",
  "status": "stable/improving/worsening",
  "medicationAdherence": "string",
  "alerts": ["string"],
  "needsEscalation": true/false,
  "escalationReason": "string"
}`;

class FollowupAgent {
  async checkIn(patientProfile, lastReport, checkinResponse) {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Patient: ${JSON.stringify(patientProfile)}\nLast Report: ${JSON.stringify(lastReport)}\nPatient Update: ${checkinResponse}` },
    ];
    return llmClient.complete(messages, { temperature: 0.3, maxTokens: 1024 });
  }
}

module.exports = new FollowupAgent();
