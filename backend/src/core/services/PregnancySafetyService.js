const llmClient = require('../lib/GeminiClient');
const openFda = require('../../infra/clients/OpenFdaClient');
const openWeather = require('../../infra/clients/OpenWeatherClient');
const openFoodFacts = require('../../infra/clients/OpenFoodFactsClient');
const { buildThemeGuardInstructions } = require('../lib/chatThemes');

const VALID_TRIMESTERS = ['1', '2', '3'];
const VALID_STATUS = ['normal', 'warning', 'danger'];
const VALID_RISK = ['low', 'medium', 'high'];

const SEVERE_SYMPTOM_PATTERNS = [
  /severe bleeding|heavy bleeding|saignement/i,
  /chest pain|douleur.*poitrine|douleur thoracique/i,
  /difficulty breathing|shortness of breath|essoufflement|du mal à respirer/i,
  /loss of consciousness|unconscious|perte de conscience|évanoui/i,
  /seizure|convulsion/i,
  /severe abdominal pain|douleur abdominale.*s[eé]v[eè]re/i,
  /no fetal movement|b[eé]b[eé].*ne bouge pas|mouvements.*(r[eé]duits|absents)/i,
  /contractions.*(before|avant).*37|premature.*labor|travail.*prématuré/i,
];

const SYSTEM_PROMPT = `You are the SHIFAA Pregnancy Safety Assistant — a cautious medical guidance tool for pregnant patients.

You can help with: symptoms during pregnancy, medication safety, FOOD & BEVERAGE safety, cosmetics, and trimester-specific advice.

CRITICAL RULES:
- NEVER provide a definitive medical diagnosis
- ALWAYS use cautious language ("may", "could", "consider", "possible")
- Prioritize patient safety above all else
- If severe or emergency symptoms are present → status MUST be "danger" and risk "high"
- If you lack critical information to give a safe answer (e.g., exact weeks of pregnancy, dosage, duration of symptoms), DO NOT GUESS. You MUST ask the user a clarifying question in the "advice" array.
- CRITICAL LANGUAGE RULE: You MUST reply in the EXACT SAME LANGUAGE that the patient used in their "Current Message". If the patient wrote in French, your JSON values MUST be in French. Do not default to Arabic.
- FOLLOW-UP RULE: If the patient mentions concerning symptoms that need monitoring, you MUST ask them: 'Do you want me to check in on you in 2 hours?' in your message. Set 'requires_followup' to false and 'followup_time_minutes' to null. ONLY if the patient has EXPLICITLY agreed to a check-in in their message (e.g., 'yes', 'sure', 'check in 30 mins'), set 'requires_followup' to true, set 'followup_time_minutes' to the agreed number of minutes (use 120 if they just say 'yes'), and write a 'followup_message'. Otherwise set 'requires_followup' to false and 'followup_time_minutes' to null.
- Output ONLY valid JSON, no markdown, no extra text

FOOD SAFETY RULES FOR PREGNANCY:
- Foods with raw milk (lait cru), unpasteurized cheese → WARNING for Listeria risk
- Raw fish (sushi, sashimi), raw seafood, smoked salmon → WARNING for Listeria/Anisakis
- Raw or undercooked meat, charcuterie, pâté → WARNING for Toxoplasmosis
- Raw eggs, homemade mayonnaise → WARNING for Salmonella
- Alcohol in any form → DANGER, strictly forbidden
- Excessive caffeine (>200mg/day) → WARNING
- Liver, vitamin A supplements in excess → WARNING for teratogenic risk
- If Open Food Facts data shows the product contains risky ingredients, flag them specifically
- If Open Food Facts data is NOT available, use your medical knowledge to assess the food
- Safe foods (fruits, cooked vegetables, pasteurized dairy) → NORMAL, reassure the patient

PROACTIVE FOOD INVESTIGATION:
- If the patient reports digestive symptoms (nausea, vomiting, diarrhea, stomach pain, cramping, bloating, food poisoning signs), you MUST ask what they ate recently in the "advice" array BEFORE giving a final assessment.
- Example: if user says "J'ai des crampes d'estomac", ask "Qu'avez-vous mangé récemment ? Certains aliments peuvent être à l'origine de ces symptômes pendant la grossesse."
- If the user mentions a specific food in their chat message (e.g., "j'ai mangé du sushi"), analyze it directly using your food safety knowledge without asking again.
- When the user asks directly about a food (e.g., "est-ce que je peux manger du fromage ?"), answer immediately with your food safety assessment.

${buildThemeGuardInstructions('pregnancy')}

OUTPUT FORMAT (strict JSON only):
{
  "status": "normal | warning | danger",
  "risk": "low | medium | high",
  "advice": ["string"],
  "consult": "string",
  "requires_followup": boolean,
  "followup_time_minutes": number | null,
  "followup_message": "string | null"
}`;

class PregnancySafetyService {
  validateInput({ pregnant, trimester, symptoms, medication, food, imageBase64 }) {
    if (pregnant !== true) {
      throw new Error('This endpoint is only for pregnant patients (pregnant must be true)');
    }

    if (!trimester || !VALID_TRIMESTERS.includes(String(trimester))) {
      throw new Error('trimester is required and must be "1", "2", or "3"');
    }

    const symptomList = Array.isArray(symptoms) ? symptoms.filter((s) => s && String(s).trim()) : [];
    const med = medication ? String(medication).trim() : '';
    const fd = food ? String(food).trim() : '';

    if (symptomList.length === 0 && !med && !fd && !imageBase64) {
      throw new Error('Provide at least one symptom, a medication name, a food item, or an image');
    }

    return {
      trimester: String(trimester),
      symptoms: symptomList,
      medication: med,
      food: fd,
    };
  }

  validateProfileCity(profile) {
    if (!profile?.city || !String(profile.city).trim()) {
      throw new Error('City not found in your profile. Please complete your profile with your city.');
    }
    return String(profile.city).trim();
  }

  hasSevereSymptoms(symptoms) {
    const text = symptoms.join(' ').toLowerCase();
    return SEVERE_SYMPTOM_PATTERNS.some((pattern) => pattern.test(text));
  }

  parseLlmJson(raw) {
    const trimmed = raw.trim();
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('LLM did not return valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!VALID_STATUS.includes(parsed.status)) parsed.status = 'warning';
    if (!VALID_RISK.includes(parsed.risk)) parsed.risk = 'medium';
    if (!Array.isArray(parsed.advice)) parsed.advice = [String(parsed.advice || 'Please consult your healthcare provider.')];
    if (!parsed.consult) parsed.consult = 'Consult your obstetrician or midwife for personalized advice.';
    if (parsed.requires_followup === undefined) parsed.requires_followup = false;
    if (parsed.followup_time_minutes === undefined) parsed.followup_time_minutes = null;
    if (parsed.followup_message === undefined) parsed.followup_message = null;

    parsed.advice = parsed.advice.map((a) => String(a)).filter(Boolean);

    return parsed;
  }

  buildUserPrompt({ trimester, symptoms, medication, food, fdaData, foodData, weather, profile, userMessage }) {
    const lines = [
      `## Patient Context`,
      `- Trimester: ${trimester}`,
      `- Preferred language: IGNORE PROFILE. ALWAYS use the exact language of the Current Message below.`,
      `- City (from profile): ${profile?.city}`,
      `- Country: ${profile?.country || 'Morocco'}`,
      `- Weight: ${profile?.weight || 'Unknown'} kg`,
      `- Drug allergies: ${profile?.drugAllergies || 'None known'}`,
      `- Is pregnant (profile flag): ${profile?.isPregnant ? 'Yes' : 'Unknown'}`,
      ``,
      `## Current Message`,
      userMessage || symptoms[symptoms.length - 1] || '',
      ``,
      `## Reported Symptoms`,
      symptoms.length ? symptoms.map((s) => `- ${s}`).join('\n') : '- None specified',
    ];

    if (medication) {
      lines.push('', '## Medication Requested', `- ${medication}`);
      lines.push('', '## OpenFDA Data');
      if (fdaData?.found) {
        lines.push(`- Brand names: ${(fdaData.rawBrandNames || []).join(', ') || 'N/A'}`);
        lines.push(`- Warnings: ${(fdaData.warnings || []).join(' | ') || 'None listed'}`);
        lines.push(`- Adverse reactions: ${(fdaData.adverseReactions || []).join(' | ') || 'None listed'}`);
        lines.push(`- Pregnancy-related info: ${(fdaData.pregnancyInfo || []).join(' | ') || 'None listed'}`);
      } else {
        lines.push('- No OpenFDA label found for this medication name. Advise caution and professional verification.');
      }
    }

    if (food) {
      lines.push('', '## Food Item Requested', `- ${food}`);
      lines.push('', '## Open Food Facts Data');
      if (foodData?.found) {
        lines.push(`- Product name: ${foodData.name || 'N/A'}`);
        lines.push(`- Ingredients: ${foodData.ingredients || 'Not available'}`);
        lines.push(`- Labels: ${foodData.labels || 'None'}`);
        lines.push(`- Allergens: ${foodData.allergens || 'None listed'}`);
        lines.push(`- Additives: ${foodData.additives || 'None listed'}`);
        lines.push(`- Nutriscore: ${foodData.nutriscore || 'N/A'}`);
      } else {
        lines.push('- Product not found in Open Food Facts. Use your medical knowledge to assess this food for pregnancy safety.');
      }
    }

    if (weather) {
      lines.push(
        '',
        '## Weather (OpenWeather)',
        `- ${weather.city}: ${weather.temperatureC}°C, ${weather.condition} (${weather.description})`,
        `- Humidity: ${weather.humidity}%`,
        `- Note: Consider heat/cold/humidity effects on pregnancy comfort when relevant`
      );
    }

    lines.push('', 'Analyze and return JSON only.');

    return lines.join('\n');
  }

  applySafetyOverrides(result, symptoms) {
    if (this.hasSevereSymptoms(symptoms)) {
      result.status = 'danger';
      result.risk = 'high';
      if (!result.advice.some((a) => /urgent|emergency|immédiat|911|15|urgence/i.test(a))) {
        result.advice.unshift(
          'Severe symptoms detected. Seek emergency care immediately or call your local emergency number.'
        );
      }
      result.consult = 'Contact emergency services or go to the nearest maternity emergency unit immediately.';
    }
    return result;
  }

  async analyze({ pregnant, trimester, symptoms, medication, food, profile, userMessage, imageBase64 }) {
    const validated = this.validateInput({ pregnant, trimester, symptoms, medication, food, imageBase64 });
    const city = this.validateProfileCity(profile);

    const [fdaData, foodData, weather] = await Promise.all([
      validated.medication ? openFda.searchDrug(validated.medication) : Promise.resolve(null),
      validated.food ? openFoodFacts.searchFood(validated.food).catch(err => {
        console.error('OpenFoodFacts API failed, continuing without food data:', err.message);
        return { found: false, query: validated.food };
      }) : Promise.resolve(null),
      openWeather.getWeatherByCity(city, profile?.country || 'Morocco').catch(err => {
        console.error('Weather API failed, continuing without weather data:', err.message);
        return null;
      }),
    ]);

    const userContent = [{ type: 'text', text: this.buildUserPrompt({
      trimester: validated.trimester,
      symptoms: validated.symptoms,
      medication: validated.medication,
      food: validated.food,
      fdaData,
      foodData,
      weather,
      profile,
      userMessage,
    }) }];
    
    if (imageBase64) {
      userContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } });
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: userContent,
      },
    ];

    const raw = await llmClient.complete(messages, { 
      temperature: 0.3, 
      maxTokens: 1200,
    });
    let result = this.parseLlmJson(raw);
    result = this.applySafetyOverrides(result, validated.symptoms);

    return {
      ...result,
      meta: {
        trimester: validated.trimester,
        city: weather?.city || city,
        weather: weather
          ? {
              temperatureC: weather.temperatureC,
              condition: weather.condition,
              description: weather.description,
            }
          : null,
        medicationChecked: validated.medication || null,
        fdaFound: fdaData?.found ?? false,
        foodChecked: validated.food || null,
        foodFound: foodData?.found ?? false,
      },
    };
  }
}

module.exports = new PregnancySafetyService();
