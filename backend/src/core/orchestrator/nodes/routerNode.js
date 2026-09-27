const { z } = require('zod');
const llmClient = require('../../lib/GeminiClient');

async function routerNode(state) {
  const { userMessage, patientProfile, messages } = state;

  // Context Minimization: Keep only 2 recent turns to maximize speed & KV-Cache hits
  const recentHistory = (messages || [])
    .slice(-2)
    .map((m) => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
    .join('\n');

  // Single-line compact profile for 90% input token reduction
  const compactProfile = llmClient.formatCompactProfile(patientProfile);

  const systemPrompt = `You are the SHIFAA Router. Select relevant agents: triage, pregnancy, pediatric, pharmacy, allergy, locator, diagnosis, report, followup.

Patient Context: ${compactProfile}
Recent History: ${recentHistory || 'None'}

Rules:
1. If patient is pregnant OR asks about drug safety with current medications/allergies → include pharmacy.
2. If child symptoms → include pediatric.
3. Include locator ONLY when the patient asks where to find a hospital, clinic or pharmacy.
4. Include diagnosis ONLY when the patient asks what condition they might have, or asks to narrow down causes or possibilities.
5. Include report ONLY when the patient explicitly asks for a written summary or report to show a doctor.
6. Include followup ONLY when the patient is answering a check-in question or reporting how they feel since a previous consultation. Do NOT use followup when the patient is REQUESTING a future check-in or reminder ("تابعني بعد 10 ثواني", "remind me in 5 minutes") — that is a triage scheduling request, and triage emits the timer.
7. Default to triage for general symptoms.
Respond ONLY in a single JSON object with EXACTLY these keys: "reasoning" (string), "agents" (array of strings, e.g. ["triage"]), "primaryDomain" (string, e.g. "triage"). Do not rename or add keys.`;

  try {
    // Providers rate-limit per minute. Without a retry a 429 here silently
    // degrades every request to triage, so back off and try again first.
    const raw = await llmClient.withRateLimitRetry(() =>
      llmClient.completeFast(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        {
          // Small schema: reasoning + agents + primaryDomain. A high cap here
          // burns the provider's output-token budget on every request.
          maxTokens: 250,
          temperature: 0.0,
          jsonSchema: true,
        }
      )
    );

    const result = llmClient.parseJSON(raw, { agents: ['triage'], primaryDomain: 'triage' });

    const validAgents = ['triage', 'pregnancy', 'pediatric', 'pharmacy', 'allergy', 'locator', 'diagnosis', 'report', 'followup'];
    const agents = (result.agents || ['triage']).filter((a) => validAgents.includes(a));
    const primaryDomain = result.primaryDomain || 'triage';

    return {
      activeAgents: agents.length > 0 ? agents : ['triage'],
      domain: primaryDomain,
    };
  } catch (error) {
    console.error('Router node error:', error.message);
    return {
      activeAgents: ['triage'],
      domain: 'triage',
      errors: [`Router failed: ${error.message}`],
    };
  }
}

module.exports = { routerNode };
