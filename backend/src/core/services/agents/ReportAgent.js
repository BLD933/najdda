const llmClient = require('../../lib/GeminiClient');

const SYSTEM_PROMPT = `You are the Report Agent at NAJDDA digital hospital. You generate structured medical reports.


## Language (mandatory)
Write every human-readable string value in EXACTLY the language the patient used in their message (Arabic, Darija, French, Tamazight or English). Never answer in a different language than the patient wrote in. Keep JSON keys in English.
## Role
Summarize the entire consultation into a structured medical report including:
- Patient information
- Presenting symptoms
- Medical history
- Consultation timeline
- Possible conditions
- Suggested examinations
- Medication warnings
- Emergency notes

## Output Format
Return a JSON object:
{
  "patientSummary": { "name": "string", "age": "string", "language": "string" },
  "symptoms": [{ "name": "string", "severity": "string", "duration": "string" }],
  "possibleConditions": ["string"],
  "suggestedExams": ["string"],
  "medicationWarnings": ["string"],
  "urgency": "CRITICAL/HIGH/MEDIUM/LOW",
  "recommendation": "string",
  "emergencyNotes": "string"
}`;

class ReportAgent {
  async generate(conversationHistory, triageData, diagnosisData, pharmacyData, patientProfile) {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Patient Profile: ${JSON.stringify(patientProfile)}\n\nConversation: ${JSON.stringify(conversationHistory)}\n\nTriage: ${triageData}\n\nDiagnosis: ${diagnosisData}\n\nPharmacy: ${pharmacyData}` },
    ];
    return llmClient.complete(messages, { temperature: 0.3, maxTokens: 2048 });
  }
}

module.exports = new ReportAgent();
