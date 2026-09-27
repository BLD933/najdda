const llmClient = require('../../lib/GeminiClient');

async function synthesisNode(state = {}) {
  const { 
    subAgentResponses = {}, 
    userMessage = '', 
    patientProfile = {}, 
    activeAgents = ['triage'], 
    domain = 'triage' 
  } = state || {};

  const safeResponses = subAgentResponses || {};
  const safeAgents = Array.isArray(activeAgents) ? activeAgents : ['triage'];

  const hasEmergency = Object.values(safeResponses).some(
    (r) => r && (r.isEmergency || r.status === 'danger' || r.status === 'CRITICAL' || r.severity === 'CRITICAL')
  );

  let followupTimeMinutes = null;
  let followupMessage = null;
  let options = null;

  // Extract followups, options, and direct reply fallbacks from sub-agents
  let directReplyFallback = '';
  for (const [agent, data] of Object.entries(safeResponses)) {
    if (data) {
      if (data.followup_time_minutes) {
        followupTimeMinutes = data.followup_time_minutes;
        followupMessage = data.followup_message || "I wanted to check on you. How are you feeling now?";
      }
      if (data.options) {
        options = data.options;
      }
      if (!directReplyFallback && data.reply) {
        directReplyFallback = data.reply;
      }
    }
  }

  const agentsSummary = Object.entries(safeResponses)
    .filter(([_, data]) => data && !data.error)
    .map(([agent, data]) => {
      let summary = `=== ${agent.toUpperCase()} ===\n`;
      if (data.reply) summary += `Reply: ${data.reply}\n`;
      if (data.status) summary += `Status: ${data.status}\n`;
      if (data.risk) summary += `Risk: ${data.risk}\n`;
      if (data.advice && Array.isArray(data.advice)) summary += `Advice: ${data.advice.join(' | ')}\n`;
      if (data.consult) summary += `Consult: ${data.consult}\n`;
      return summary;
    })
    .join('\n');

  const errorsList = Object.entries(safeResponses)
    .filter(([_, data]) => data && data.error)
    .map(([agent, data]) => `${agent}: ${data.error}`);

  const compactContext = llmClient.formatCompactProfile(patientProfile);

  // OPTIMIZATION: If only ONE agent was activated and provided a direct reply, use it directly!
  // This avoids double LLM calls (cuts response time by 50%) and prevents instruction-repeating bugs.
  if (safeAgents.length === 1 && directReplyFallback) {
    let content = directReplyFallback;

    const timeMatch = content.match(/\[FOLLOWUP_TIME_MINUTES:\s*([\d.]+)\]/);
    const secMatch = content.match(/\[FOLLOWUP_TIME_SECONDS:\s*([\d.]+)\]/);
    const msgMatch = content.match(/\[FOLLOWUP_MSG:\s*(.+?)\]/);
    if (secMatch) followupTimeMinutes = parseFloat(secMatch[1]) / 60;
    else if (timeMatch) followupTimeMinutes = parseFloat(timeMatch[1]);
    if (msgMatch) followupMessage = msgMatch[1];

    const optionsMatch = content.match(/\[OPTIONS:\s*(.+?)\]/);
    if (optionsMatch) {
      options = optionsMatch[1].split('|').map(o => o.trim()).filter(Boolean);
    }

    content = content
      .replace(/\[SEVERITY:\s*.+?\]/g, '')
      .replace(/\[FOLLOWUP_TIME_MINUTES:\s*[\d.]+\]/g, '')
      .replace(/\[FOLLOWUP_TIME_SECONDS:\s*[\d.]+\]/g, '')
      .replace(/\[FOLLOWUP_MSG:\s*.+?\]/g, '')
      .replace(/\[OPTIONS:\s*.+?\]/g, '')
      .trim();

    return {
      finalResponse: {
        text: content,
        isEmergency: hasEmergency,
        agentsUsed: safeAgents,
        followupTimeMinutes,
        followupMessage,
        options,
      },
    };
  }

  const prompt = `System: You are SHIFAA Synthesis Agent. Write a friendly 2-sentence response directly to the patient in the exact language they used. Do NOT list rules, do NOT write headings or numbers.

Patient context: ${compactContext}
Specialist Findings: ${agentsSummary}
Patient message: "${userMessage}"`;

  try {
    const rawContent = await llmClient.complete(
      [
        { role: 'user', content: prompt },
      ],
      {
        model: process.env.LLM_MODEL_DEEP || 'openai/gpt-oss-120b',
        maxTokens: 1024,
        temperature: 0.1,
      }
    );

    let content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);

    // Clean formatting tags
    const timeMatch = content.match(/\[FOLLOWUP_TIME_MINUTES:\s*([\d.]+)\]/);
    const secMatch = content.match(/\[FOLLOWUP_TIME_SECONDS:\s*([\d.]+)\]/);
    const msgMatch = content.match(/\[FOLLOWUP_MSG:\s*(.+?)\]/);

    if (secMatch) {
      followupTimeMinutes = parseFloat(secMatch[1]) / 60;
    } else if (timeMatch) {
      followupTimeMinutes = parseFloat(timeMatch[1]);
    }
    if (msgMatch) {
      followupMessage = msgMatch[1];
    }

    const optionsMatch = content.match(/\[OPTIONS:\s*(.+?)\]/);
    if (optionsMatch) {
      options = optionsMatch[1].split('|').map(o => o.trim()).filter(Boolean);
    }

    content = content
      .replace(/\[FOLLOWUP_TIME_MINUTES:\s*[\d.]+\]/g, '')
      .replace(/\[FOLLOWUP_TIME_SECONDS:\s*[\d.]+\]/g, '')
      .replace(/\[FOLLOWUP_MSG:\s*.+?\]/g, '')
      .replace(/\[OPTIONS:\s*.+?\]/g, '')
      .trim();

    // If synthesis returned empty content, use direct agent reply fallback
    if (!content) {
      content = directReplyFallback || "Je suis là pour vous accompagner. Comment puis-je vous aider davantage ?";
    }

    return {
      finalResponse: {
        text: content,
        isEmergency: hasEmergency,
        agentsUsed: safeAgents,
        followupTimeMinutes,
        followupMessage,
        options,
      },
    };
  } catch (error) {
    console.warn('⚠️ [Synthesis Node] Synthesis failed, using direct agent fallback:', error.message);
    return {
      finalResponse: {
        text: directReplyFallback || "Je suis là pour vous accompagner. Comment vous sentez-vous actuellement ?",
        isEmergency: hasEmergency,
        agentsUsed: safeAgents,
        followupTimeMinutes,
        followupMessage,
        options,
      },
      errors: [`Synthesis fallback used: ${error.message}`],
    };
  }
}

module.exports = { synthesisNode };
