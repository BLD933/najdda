const llmClient = require('../lib/GeminiClient');
const RxNavClient = require('../../infra/clients/RxNavClient');
const OpenFdaClient = require('../../infra/clients/OpenFdaClient');
const { buildThemeGuardInstructions } = require('../lib/chatThemes');
const path = require('path');
const { executePythonSkill } = require('../tools/pythonExecutor');

const SYSTEM_PROMPT = `You are the SHIFAA Medication Expert — a highly specialized pharmacist AI assistant.

Your job is to analyze potential drug interactions, side effects, and safety warnings for the patient's current medications and symptoms.

CRITICAL RULES:
1. NEVER provide a definitive medical diagnosis or prescribe medications.
2. ALWAYS use cautious language ("may", "could", "possible").
3. Prioritize patient safety. If you detect severe interactions (e.g., bleeding risk, serotonin syndrome) → status MUST be "danger" and risk MUST be "high".
4. If a medication is not recognized, inform the user clearly in your response.
5. If you lack critical information (e.g., dosage, duration, specific symptoms), ask a clarifying question in the "advice" array.
6. CRITICAL LANGUAGE RULE: You MUST reply in the EXACT SAME LANGUAGE the patient used.
7. PROACTIVE FOLLOW-UP: If the patient mentions feeling weak, tired, dizzy, or needs monitoring, you MUST ask them: 'Do you want me to check in on you in 2 hours?' in your advice. Set 'followup_time_minutes' to null. ONLY if the patient has EXPLICITLY agreed to a check-in in their message (e.g., 'yes', 'sure', 'check in 30 mins'), set 'followup_time_minutes' to the agreed number of minutes (use 120 if they just say 'yes'), and write a 'followup_message'. Otherwise set 'followup_time_minutes' to null.
8. Output ONLY valid JSON, no markdown, no extra text.

${buildThemeGuardInstructions('medications')}

OUTPUT FORMAT (strict JSON only):
{
  "status": "normal | warning | danger",
  "risk": "low | medium | high",
  "advice": ["Actionable advice 1", "Actionable advice 2"],
  "consult": "When to see a doctor or pharmacist",
  "followup_time_minutes": 30,
  "followup_message": "A short, caring message to check in, or null"
}`;

class DrugSafetyService {
  /**
   * Helper to fetch data for all drugs concurrently
   */
  async gatherDrugData(medications) {
    if (!medications || medications.length === 0) return { warnings: [], interactions: [] };

    // 1. Fetch individual drug warnings from OpenFDA
    const fdaPromises = medications.map(drug => OpenFdaClient.searchDrug(drug));
    const fdaResults = await Promise.allSettled(fdaPromises);
    
    let fdaWarnings = [];
    fdaResults.forEach(res => {
      if (res.status === 'fulfilled' && res.value && res.value.found) {
        fdaWarnings.push({
          drug: res.value.query,
          warnings: res.value.warnings.slice(0, 2), // Keep it concise
          adverseReactions: res.value.adverseReactions.slice(0, 2)
        });
      }
    });

    // 2. Fetch interactions from RxNav
    let interactions = [];
    if (medications.length >= 2) {
      const rxCuiPromises = medications.map(drug => RxNavClient.getRxCUI(drug));
      const rxCuiResults = await Promise.allSettled(rxCuiPromises);
      
      const rxcuiList = rxCuiResults
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);
        
      if (rxcuiList.length >= 2) {
        interactions = await RxNavClient.getInteractions(rxcuiList);
      }
    }

    // 3. Fetch interactions from OpenClaw Python Skill
    let openClawInteractions = null;
    if (medications.length >= 2) {
      try {
        const scriptPath = path.resolve(__dirname, '../../../../.agents/skills/drug-interaction-checker/impl.py');
        const drugString = medications.join(', ');
        openClawInteractions = await executePythonSkill(scriptPath, ['--drugs', drugString]);
      } catch (err) {
        console.error('OpenClaw execution failed:', err);
      }
    }

    return { fdaWarnings, interactions, openClawInteractions };
  }

  async checkInteraction({ message, history = [], medications = [], profile = {}, imageBase64 }) {
    // 1. Fetch drug data
    const { fdaWarnings, interactions, openClawInteractions } = await this.gatherDrugData(medications);

    let contextStr = "DRUG SAFETY CONTEXT:\\n";
    
    // Inject Personal Medical Profile
    contextStr += "PATIENT MEDICAL RECORD:\\n";
    contextStr += `- Age: ${profile.age || 'Unknown'}\\n`;
    contextStr += `- Gender: ${profile.gender || 'Unknown'}\\n`;
    contextStr += `- Chronic Conditions: ${profile.chronicDiseases || 'None'}\\n`;
    contextStr += `- Known Drug Allergies: ${profile.drugAllergies || 'None known'}\\n`;
    contextStr += `- Pregnant: ${profile.isPregnant ? 'Yes' : 'No'}\\n\\n`;

    if (medications.length > 0) {
      contextStr += `Patient's Medication List: ${medications.join(', ')}\\n\\n`;
    } else {
      contextStr += `Patient's Medication List: None provided.\\n\\n`;
    }

    if (interactions && interactions.length > 0) {
      contextStr += "KNOWN DRUG INTERACTIONS (from NIH RxNav):\\n";
      interactions.forEach(interaction => {
        contextStr += `- Between [${interaction.drugs.join(' and ')}]: Severity: ${interaction.severity}. Description: ${interaction.description}\\n`;
      });
      contextStr += "\\n";
    }

    if (openClawInteractions && openClawInteractions.interactions && openClawInteractions.interactions.length > 0) {
      contextStr += "KNOWN DRUG INTERACTIONS (from OpenClaw Python DB):\\n";
      openClawInteractions.interactions.forEach(interaction => {
        contextStr += `- Between [${interaction.drug_1} and ${interaction.drug_2}]: Severity: ${interaction.severity}. Effect: ${interaction.effect} Recommendation: ${interaction.recommendation}\\n`;
      });
      contextStr += "\\n";
    }

    if (fdaWarnings && fdaWarnings.length > 0) {
      contextStr += "INDIVIDUAL DRUG WARNINGS (from OpenFDA):\\n";
      fdaWarnings.forEach(fw => {
        contextStr += `- Drug: ${fw.drug}\\n`;
        if (fw.warnings && fw.warnings.length > 0) {
          contextStr += `  Warnings: ${fw.warnings.join(' | ')}\\n`;
        }
        if (fw.adverseReactions && fw.adverseReactions.length > 0) {
          contextStr += `  Adverse Reactions: ${fw.adverseReactions.join(' | ')}\\n`;
        }
      });
      contextStr += "\\n";
    }

    // 3. Map history for Groq
    const mappedHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text || msg.content
    }));

    // Add current context + message as the final user message
    const userPrompt = `${contextStr}CURRENT MESSAGE:\\n${message}\\n\\n[SYSTEM OVERRIDE]: CRITICAL LANGUAGE RULE: If the user explicitly requests a specific language in their message (e.g., 'Answer in Arabic'), you MUST strictly write all string values ('advice', 'consult', 'followup_message') in that requested language. Otherwise, you MUST detect the language of the 'CURRENT MESSAGE' and write all string values in that detected language. Do not mix languages.`;
    
    const userContent = [{ type: 'text', text: userPrompt }];
    if (imageBase64) {
      userContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } });
    }
    
    mappedHistory.push({ role: 'user', content: userContent });

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...mappedHistory
    ];

    const raw = await llmClient.complete(messages, { 
      temperature: 0.2, 
      maxTokens: 1200,
    });

    let result;
    try {
      const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```json/gi, '').replace(/```/gi, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      result = JSON.parse(match ? match[0] : cleaned);
      
      const requiredKeys = ['status', 'risk', 'advice', 'consult'];
      for (const key of requiredKeys) {
        if (!(key in result)) {
          result[key] = key === 'advice' ? [] : (key === 'status' ? 'normal' : 'unknown');
        }
      }
      if (result.followup_time_minutes === undefined) result.followup_time_minutes = null;
      if (result.followup_message === undefined) result.followup_message = null;
    } catch (e) {
      console.warn('DrugSafetyService JSON fallback used:', e.message);
      result = {
        status: "normal",
        risk: "low",
        advice: ["Vérifiez toujours auprès de votre médecin ou pharmacien avant de modifier vos doses."],
        consult: "N'hésitez pas à poser vos questions à votre pharmacien.",
        followup_time_minutes: null,
        followup_message: null
      };
    }

    // Return LLM result along with meta info
    return {
      ...result,
      meta: {
        medicationsChecked: medications,
        interactionsFound: interactions.length + (openClawInteractions ? openClawInteractions.interaction_count : 0),
        warningsFound: fdaWarnings.length
      }
    };
  }
}

module.exports = new DrugSafetyService();
