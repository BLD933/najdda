const triageAgent = require('../../services/agents/TriageAgent');
const pregnancySafetyService = require('../../services/PregnancySafetyService');
const childSafetyService = require('../../services/ChildSafetyService');
const drugSafetyService = require('../../services/DrugSafetyService');
const allergyAnalyzerService = require('../../services/AllergyAnalyzerService');
const diagnosisAgent = require('../../services/agents/DiagnosisAgent');
const locatorAgent = require('../../services/agents/LocatorAgent');
const reportAgent = require('../../services/agents/ReportAgent');
const followupAgent = require('../../services/agents/FollowupAgent');
const llmClient = require('../../lib/GeminiClient');

async function triageNode(state) {
  const { messages, patientProfile, userMessage } = state;
  try {
    const history = [
      // A malformed entry (missing role) makes the provider reject the entire
      // request with a 400, so drop anything unusable instead of passing it on.
      ...messages
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
        .map((m) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
      { role: 'user', content: userMessage }
    ];
    const reply = await triageAgent.assess(history, patientProfile);
    const severity = triageAgent.getSeverity(reply);
    const timeMatch = reply.match(/\[FOLLOWUP_TIME_MINUTES:\s*([\d.]+)\]/);
    const secMatch = reply.match(/\[FOLLOWUP_TIME_SECONDS:\s*([\d.]+)\]/);
    const msgMatch = reply.match(/\[FOLLOWUP_MSG:\s*(.+?)\]/);

    const followupTimeMinutes = secMatch 
      ? parseFloat(secMatch[1]) / 60 
      : (timeMatch ? parseFloat(timeMatch[1]) : null);

    return {
      subAgentResponses: {
        triage: {
          reply,
          severity,
          isEmergency: severity === 'CRITICAL',
          followup_time_minutes: followupTimeMinutes,
          followup_message: msgMatch ? msgMatch[1] : null,
        },
      },
    };
  } catch (error) {
    return {
      subAgentResponses: {
        triage: { error: error.message },
      },
      errors: [`Triage agent failed: ${error.message}`],
    };
  }
}

async function pregnancyNode(state) {
  const { patientProfile, userMessage } = state;
  try {
    const trimester = patientProfile.trimester || '2';
    const result = await pregnancySafetyService.analyze({
      pregnant: true,
      trimester,
      symptoms: [userMessage],
      medication: patientProfile.currentMedication || '',
      food: '',
      profile: patientProfile,
      userMessage,
    });
    return {
      subAgentResponses: {
        pregnancy: {
          status: result.status,
          risk: result.risk,
          advice: result.advice,
          consult: result.consult,
          isEmergency: result.isEmergency,
          followup_time_minutes: result.followup_time_minutes,
          followup_message: result.followup_message,
          meta: result.meta,
        },
      },
    };
  } catch (error) {
    return {
      subAgentResponses: {
        pregnancy: { error: error.message },
      },
      errors: [`Pregnancy agent failed: ${error.message}`],
    };
  }
}

async function pediatricNode(state) {
  const { patientProfile, userMessage } = state;
  try {
    const childProfile = patientProfile.child || {};
    const result = await childSafetyService.analyze({
      message: userMessage,
      history: [],
      childProfile: {
        age_months: childProfile.ageMonths,
        weight_kg: childProfile.weightKg,
      },
      medication: patientProfile.currentMedication || '',
    });
    return {
      subAgentResponses: {
        pediatric: {
          status: result.status,
          risk: result.risk,
          dosage_guidance: result.dosage_guidance,
          advice: result.advice,
          consult: result.consult,
        },
      },
    };
  } catch (error) {
    return {
      subAgentResponses: {
        pediatric: { error: error.message },
      },
      errors: [`Pediatric agent failed: ${error.message}`],
    };
  }
}

async function pharmacyNode(state) {
  const { patientProfile, userMessage, messages } = state;
  try {
    const medications = patientProfile.medications
      ? (Array.isArray(patientProfile.medications)
        ? patientProfile.medications.map((m) => m.nom || m)
        : [patientProfile.medications])
      : [];

    const history = messages.map((m) => ({
      role: m.role,
      text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }));

    const result = await drugSafetyService.checkInteraction({
      message: userMessage,
      history,
      medications,
      profile: patientProfile,
    });
    return {
      subAgentResponses: {
        pharmacy: {
          status: result.status,
          risk: result.risk,
          advice: result.advice,
          consult: result.consult,
          followup_time_minutes: result.followup_time_minutes,
          followup_message: result.followup_message,
          interactionsFound: result.meta?.interactionsFound || 0,
          warningsFound: result.meta?.warningsFound || 0,
        },
      },
    };
  } catch (error) {
    return {
      subAgentResponses: {
        pharmacy: { error: error.message },
      },
      errors: [`Pharmacy agent failed: ${error.message}`],
    };
  }
}

async function allergyNode(state) {
  const { patientProfile, userMessage } = state;
  try {
    const city = patientProfile.city || 'Casablanca';
    const result = await allergyAnalyzerService.check({
      symptoms: [userMessage],
      message: userMessage,
      history: [],
      city,
      profile: patientProfile,
    });
    return {
      subAgentResponses: {
        allergy: {
          status: result.status,
          allergy_risk: result.allergy_risk,
          likely_cause: result.likely_cause,
          advice: result.advice,
          message: result.message,
          when_to_act: result.when_to_act,
          followup_time_minutes: result.followup_time_minutes,
          followup_message: result.followup_message,
        },
      },
    };
  } catch (error) {
    return {
      subAgentResponses: {
        allergy: { error: error.message },
      },
      errors: [`Allergy agent failed: ${error.message}`],
    };
  }
}

async function locatorNode(state) {
  const { patientProfile, userMessage } = state;
  try {
    const result = await locatorAgent.locate(
      'routine',
      userMessage,
      patientProfile.city || patientProfile.country || 'Morocco',
      'general'
    );
    return {
      subAgentResponses: {
        locator: {
          reply: humanizeAgentOutput(result),
          status: 'ok',
        },
      },
    };
  } catch (error) {
    return {
      subAgentResponses: {
        locator: { error: error.message },
      },
      errors: [`Locator agent failed: ${error.message}`],
    };
  }
}

// Diagnosis runs in parallel with the other nodes, so it cannot read triage's
// output from this pass. It re-derives the essentials from the message and the
// patient's own profile rather than depending on another node's result.
async function diagnosisNode(state) {
  const { messages, patientProfile, userMessage } = state;
  try {
    const history = [
      ...messages
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
        .map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
      { role: 'user', content: userMessage },
    ];
    // Pass a minimal triage-shaped object rather than null: DiagnosisAgent reads
    // `triageData` and will otherwise narrate "triage data is null" to the patient.
    const triageData = { severity: 'UNASSESSED', reply: userMessage };
    const reply = await diagnosisAgent.analyze(history, triageData, patientProfile);
    return {
      subAgentResponses: {
        diagnosis: { reply: humanizeAgentOutput(reply), status: 'ok' },
      },
    };
  } catch (error) {
    return {
      subAgentResponses: {
        diagnosis: { error: error.message },
      },
      errors: [`Diagnosis agent failed: ${error.message}`],
    };
  }
}

async function reportNode(state) {
  const { messages, patientProfile, userMessage } = state;
  try {
    const history = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
      .map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }));
    const reply = await reportAgent.generate(history, null, null, null, patientProfile);
    return {
      subAgentResponses: {
        report: { reply: humanizeAgentOutput(reply), status: 'ok' },
      },
    };
  } catch (error) {
    return {
      subAgentResponses: {
        report: { error: error.message },
      },
      errors: [`Report agent failed: ${error.message}`],
    };
  }
}

async function followupNode(state) {
  const { patientProfile, messages, userMessage } = state;
  try {
    const lastReport = [...messages].reverse().find(m => m && m.role === 'assistant')?.content || '';
    const reply = await followupAgent.checkIn(patientProfile, lastReport, userMessage);
    return {
      subAgentResponses: {
        followup: { reply: humanizeAgentOutput(reply), status: 'ok' },
      },
    };
  } catch (error) {
    return {
      subAgentResponses: {
        followup: { error: error.message },
      },
      errors: [`Follow-up agent failed: ${error.message}`],
    };
  }
}

/**
 * These agents answer with a JSON document rather than prose. The synthesis
 * node puts an agent's `reply` straight in front of the patient, so unwrap the
 * useful field here instead of showing raw JSON in the chat.
 */
function humanizeAgentOutput(raw) {
  if (typeof raw !== 'string') return String(raw || '');
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return trimmed;

  const parsed = llmClient.parseJSON(trimmed, null);
  if (!parsed) return trimmed;

  const text =
    parsed.reply || parsed.guidance || parsed.message || parsed.checkin ||
    parsed.assessment || parsed.reason || parsed.notes || parsed.summary;
  if (typeof text === 'string' && text.trim()) return text.trim();

  return Object.values(parsed)
    .filter(v => typeof v === 'string' && v.trim())
    .join(' ')
    .trim() || trimmed;
}

const AGENT_MAP = {
  triage: triageNode,
  pregnancy: pregnancyNode,
  pediatric: pediatricNode,
  pharmacy: pharmacyNode,
  allergy: allergyNode,
  diagnosis: diagnosisNode,
  locator: locatorNode,
  report: reportNode,
  followup: followupNode,
};

async function agentRouterNode(state) {
  const { activeAgents } = state;
  if (!activeAgents || activeAgents.length === 0) {
    return {};
  }

  const uniqueAgents = [...new Set(activeAgents)];
  const results = await Promise.allSettled(
    uniqueAgents.map((agent) => {
      const nodeFn = AGENT_MAP[agent];
      if (!nodeFn) {
        return Promise.resolve({
          subAgentResponses: { [agent]: { error: `Unknown agent: ${agent}` } },
        });
      }
      return nodeFn(state);
    })
  );

  let mergedResponses = {};
  let mergedErrors = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      mergedResponses = { ...mergedResponses, ...result.value.subAgentResponses };
      if (result.value.errors) {
        mergedErrors = [...mergedErrors, ...result.value.errors];
      }
    } else {
      mergedErrors.push(`Agent execution failed: ${result.reason}`);
    }
  }

  return {
    subAgentResponses: mergedResponses,
    errors: mergedErrors.length > 0 ? mergedErrors : undefined,
  };
}

module.exports = {
  agentRouterNode,
  AGENT_MAP,
  triageNode,
  pregnancyNode,
  pediatricNode,
  pharmacyNode,
  allergyNode,
};
