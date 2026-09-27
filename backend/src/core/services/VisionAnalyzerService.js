const llmClient = require('../lib/GeminiClient');

class VisionAnalyzerService {
  async analyze(imageBase64, textMessage = "Que voyez-vous sur cette image concernant ma santé ?", profile = {}) {
    const prompt = `Vous êtes un expert médical de l'application NAJDDA.
Le patient (Sexe: ${profile.gender || 'non précisé'}, Âge: ${profile.age || 'non précisé'}) a envoyé une image pour analyse.
Message du patient: "${textMessage}"

Veuillez analyser cette image médicalement et donner une évaluation de ce que cela pourrait être. 
Important: 
1. Rappelez toujours que vous êtes une IA et que cela ne remplace pas une consultation.
2. Si vous observez un signe grave, recommandez une consultation.
3. Soyez rassurant et professionnel.
4. Terminez votre réponse par [SEVERITY: CRITICAL] si l'image suggère une urgence, sinon [SEVERITY: LOW].
`;

    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      }
    ];

    try {
      // the fast model is multimodal — no separate vision model needed
      const result = await llmClient.complete(messages, {
        maxTokens: 1024,
        temperature: 0.3
      });

      const isEmergency = /\[SEVERITY:\s*CRITICAL\]/i.test(result);
      return {
        reply: result,
        isEmergency,
        requires_followup: true,
        followup_message: "Comment évolue le symptôme que vous avez pris en photo hier ?"
      };
    } catch (error) {
      console.error("Vision API Error:", error);
      throw new Error("L'analyse de l'image a échoué. " + error.message);
    }
  }
}

module.exports = new VisionAnalyzerService();
