/**
 * Theme definitions for specialized SHIFAA chats.
 * General triage has no theme restriction (handles all topics).
 */
const CHAT_THEMES = {
  pregnancy: {
    id: 'pregnancy',
    title: 'Femmes enceintes — Pregnancy Safety',
    scope:
      'pregnancy-related symptoms, medication safety during pregnancy, maternal health, trimester-specific concerns, prenatal warnings, and weather-related pregnancy comfort',
    redirectHint: 'General Triage',
  },
  allergies: {
    id: 'allergies',
    title: 'Allergies',
    scope: 'allergic reactions, food/drug/environmental allergies, allergy symptoms and safety',
    redirectHint: 'General Triage',
  },
  children: {
    id: 'children',
    title: 'Petits enfants — Pediatric Triage',
    scope: 'health concerns for infants and young children, pediatric symptoms and guidance',
    redirectHint: 'General Triage',
  },
  medications: {
    id: 'medications',
    title: 'Médicaments — Drug Safety',
    scope: 'medication questions, drug interactions, dosage safety, and pharmaceutical warnings',
    redirectHint: 'General Triage',
  },
};

function buildThemeGuardInstructions(themeId) {
  const theme = CHAT_THEMES[themeId];
  if (!theme) return '';

  return `
## CHAT THEME ENFORCEMENT (MANDATORY)
You are in the "${theme.title}" chat.
Your scope is LIMITED to: ${theme.scope}

If the user's message is NOT related to this scope (e.g. unrelated hobbies, politics, coding, sports, general topics, or health issues outside this theme):
- Do NOT answer the off-topic question
- Set status to "normal", risk to "low"
- In advice, politely explain: "This chat is dedicated to ${theme.title}. I can only help with topics related to ${theme.scope}. For other health concerns, please use ${theme.redirectHint}."
- In consult, suggest switching to ${theme.redirectHint} if needed
- Set offTopic to true in your internal reasoning but still return valid JSON

If the message IS on-topic, proceed with full medical safety analysis.`;
}

function buildOffTopicResponse(themeId, language = 'French') {
  const theme = CHAT_THEMES[themeId];
  if (!theme) return null;

  const advice =
    language === 'Arabic'
      ? `هاد المحادثة مخصصة لـ ${theme.title}. كنقدر نعاونك غير فـ ${theme.scope}. استعمل ${theme.redirectHint} للأسئلة الأخرى.`
      : language === 'English'
        ? `This chat is dedicated to ${theme.title}. I can only help with ${theme.scope}. Please use ${theme.redirectHint} for other questions.`
        : `Ce chat est dédié à ${theme.title}. Je peux uniquement vous aider concernant : ${theme.scope}. Utilisez ${theme.redirectHint} pour d'autres sujets.`;

  return {
    status: 'normal',
    risk: 'low',
    advice: [advice],
    consult: `Pour d'autres sujets de santé, ouvrez ${theme.redirectHint} depuis le hub Triage.`,
    offTopic: true,
  };
}

module.exports = { CHAT_THEMES, buildThemeGuardInstructions, buildOffTopicResponse };
