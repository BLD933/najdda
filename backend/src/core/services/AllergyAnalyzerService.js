const llmClient = require('../lib/GeminiClient');
const OpenWeatherClient = require('../../infra/clients/OpenWeatherClient');
const OpenMeteoClient = require('../../infra/clients/OpenMeteoClient');

class AllergyAnalyzerService {
  constructor() {
    this.llmClient = llmClient;
    this.openWeather = OpenWeatherClient;
    this.openMeteo = OpenMeteoClient;
  }

  buildSystemPrompt(weather, airQuality, profile = {}) {
    let contextStr = "PATIENT MEDICAL RECORD:\\n";
    contextStr += `- Age: ${profile.age || 'Unknown'}\\n`;
    contextStr += `- Gender: ${profile.gender || 'Unknown'}\\n`;
    contextStr += `- Chronic Conditions: ${profile.chronicDiseases || 'None'}\\n`;
    contextStr += `- Known Drug Allergies: ${profile.drugAllergies || 'None known'}\\n`;
    contextStr += `- Pregnant: ${profile.isPregnant ? 'Yes' : 'No'}\\n\\n`;

    contextStr += "ENVIRONMENTAL CONTEXT:\\n";
    if (weather) {
      contextStr += `- Weather: ${weather.temperatureC}°C, Humidity: ${weather.humidity}%, Wind: ${weather.windSpeed}m/s, Conditions: ${weather.description}\\n`;
    }
    if (airQuality) {
      contextStr += `- Air Quality (AQI US): ${airQuality.aqi_us} (${airQuality.air_quality_level})\\n`;
      contextStr += `- Pollen Level: ${airQuality.pollen_level} (Total grains: ${airQuality.total_pollen_grains})\\n`;
    }
    if (!weather && !airQuality) {
      contextStr += "- No environmental data available for this location.\\n";
    }

    return `You are the NAJDDA Allergy & Respiratory Expert — a specialized medical AI assistant.
Your job is to analyze the user's symptoms and determine if they are likely suffering from allergies, pollution irritation, or a different condition, using the provided environmental data.

CRITICAL RULES:
1. NEVER provide a definitive medical diagnosis.
2. ALWAYS use cautious language ("may", "could", "possible").
3. If symptoms are severe (e.g., severe shortness of breath, anaphylaxis signs, swelling of lips/throat) → status MUST be "danger", risk MUST be "high", and you must advise immediate medical attention.
4. If you lack critical information, ask a clarifying question in the "message" field. (e.g., "Avez-vous été en contact avec des animaux ?")
5. CRITICAL LANGUAGE RULE: You MUST reply in the EXACT SAME LANGUAGE the patient used.
6. PROACTIVE FOLLOW-UP: If the patient mentions feeling weak, tired, dizzy, or needs monitoring, you MUST ask them: 'Do you want me to check in on you in 2 hours?' in your message. Set 'followup_time_minutes' to null. ONLY if the patient has EXPLICITLY agreed to a check-in in their message (e.g., 'yes', 'sure', 'check in 30 mins'), set 'followup_time_minutes' to the agreed number of minutes (use 120 if they just say 'yes'), and write a 'followup_message'. Otherwise set 'followup_time_minutes' to null.
7. Output ONLY valid JSON, no markdown, no extra text.

SMART LOGIC:
- If AQI > 100 (poor/very poor) and respiratory symptoms exist → consider pollution irritation as a likely cause.
- If Pollen level is medium/high and symptoms match (runny nose, itchy eyes) → consider pollen allergy.
- If Humidity > 70% → consider mold or dust mites.
- If Wind > 5m/s → pollen and dust spread faster.

${contextStr}

OUTPUT FORMAT (strict JSON only):
{
  "status": "normal | warning | danger",
  "allergy_risk": "low | medium | high",
  "likely_cause": "pollen | dust | mold | pollution | unknown",
  "advice": ["Actionable advice 1", "Actionable advice 2"],
  "when_to_act": "When to see a doctor",
  "message": "A friendly, conversational response summarizing your analysis and asking a follow-up question if needed.",
  "followup_time_minutes": 30,
  "followup_message": "A short, caring message to check in, or null"
}`;
  }

  buildUserPrompt(symptoms, message, history) {
    let prompt = "";
    if (history && history.length > 0) {
      prompt += "PREVIOUS CONVERSATION:\\n";
      history.forEach(msg => {
        prompt += `${msg.role === 'user' ? 'Patient' : 'Assistant'}: ${msg.text}\\n`;
      });
      prompt += "\\n";
    }

    prompt += "CURRENT STATE:\\n";
    if (symptoms && symptoms.length > 0) {
      prompt += `Reported Symptoms: ${symptoms.join(', ')}\\n`;
    } else {
      prompt += `Reported Symptoms: None specifically listed.\\n`;
    }
    
    prompt += `\\nCURRENT MESSAGE:\\n${message}`;

    // Add language override instruction at the end to force compliance
    prompt += `\\n\\n[SYSTEM OVERRIDE]: CRITICAL LANGUAGE RULE: If the user explicitly requests a specific language in their message (e.g., 'Answer in Arabic'), you MUST strictly write all string values ('message', 'advice', 'when_to_act', 'followup_message') in that requested language. Otherwise, you MUST detect the language of the 'CURRENT MESSAGE' and write all string values in that detected language. Do not mix languages.`;
    
    return prompt;
  }

  async parseLlmJson(rawOutput) {
    try {
      const cleaned = rawOutput.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      const requiredKeys = ['status', 'allergy_risk', 'likely_cause', 'advice', 'when_to_act', 'message'];
      for (const key of requiredKeys) {
        if (!(key in parsed)) {
          parsed[key] = key === 'advice' ? [] : (key === 'status' ? 'normal' : 'unknown');
        }
      }
      if (parsed.followup_time_minutes === undefined) parsed.followup_time_minutes = null;
      if (parsed.followup_message === undefined) parsed.followup_message = null;
      return parsed;
    } catch (e) {
      console.error("Failed to parse LLM JSON:", e.message);
      return {
        status: "warning",
        allergy_risk: "unknown",
        likely_cause: "unknown",
        advice: ["Je n'ai pas pu analyser correctement votre situation."],
        when_to_act: "If your symptoms worsen, consult a doctor.",
        message: "I encountered a technical error during analysis. Could you repeat your symptoms?",
        followup_time_minutes: null,
        followup_message: null
      };
    }
  }

  async check({ symptoms = [], message = '', history = [], city = 'Casablanca', profile = {}, imageBase64 }) {
    let weatherData = null;
    let airQualityData = null;

    try {
      // 1. Fetch Weather (which also gives us lat/lon for the city)
      weatherData = await this.openWeather.getWeatherByCity(city);
      
      // 2. Fetch Pollen/AQI using coordinates from Weather API
      if (weatherData && weatherData.lat && weatherData.lon) {
        airQualityData = await this.openMeteo.getAirQualityAndPollen(weatherData.lat, weatherData.lon);
      }
    } catch (err) {
      console.warn("Could not fetch environmental data:", err.message);
      // We continue without environmental data (fallback gracefully)
    }

    const systemPrompt = this.buildSystemPrompt(weatherData, airQualityData, profile);
    const userPrompt = this.buildUserPrompt(symptoms, message, history);

    try {
      const userContent = [{ type: 'text', text: userPrompt }];
      if (imageBase64) {
        userContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } });
      }
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ];
      const llmResponse = await this.llmClient.complete(messages, { 
        temperature: 0.3, 
        maxTokens: 1200,
      });
      const parsed = await this.parseLlmJson(llmResponse);

      // Attach environmental data as meta for the frontend to optionally display
      return {
        ...parsed,
        meta: {
          city,
          weather: weatherData ? {
            temperatureC: weatherData.temperatureC,
            humidity: weatherData.humidity,
            windSpeed: weatherData.windSpeed,
            condition: weatherData.condition
          } : null,
          airQuality: airQualityData ? {
            aqi: airQualityData.aqi_us,
            level: airQualityData.air_quality_level,
            pollenLevel: airQualityData.pollen_level
          } : null
        }
      };
    } catch (err) {
      console.error("AllergyAnalyzerService LLM Error:", err.message);
      throw new Error("Erreur lors de l'analyse des allergies");
    }
  }
}

module.exports = new AllergyAnalyzerService();
