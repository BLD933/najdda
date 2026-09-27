const llmClient = require('../lib/GeminiClient');
const OpenFdaClient = require('../../infra/clients/OpenFdaClient');

const SYSTEM_PROMPT = `Tu es un expert médical spécialisé en pédiatrie. Ton rôle est d'analyser les symptômes et la sécurité des médicaments pour un enfant.

RÈGLES STRICTES DE SÉCURITÉ PÉDIATRIQUE:
1. INTERDICTION DE DOSAGE CHIFFRÉ: Ne donne JAMAIS un calcul de dosage exact (ex: "donnez 2.5 ml" ou "donnez 150 mg"). Tu dois conseiller : "Fiez-vous à la pipette graduée au poids de l'enfant (X kg)" ou "Respectez la dose indiquée sur la notice pour son poids".
2. ALERTES ROUGES: Si les symptômes sont très graves (convulsions, difficulté respiratoire sévère, cyanose, perte de connaissance, fièvre > 40°C), renvoie un status "danger" avec conseil immédiat d'aller aux urgences ou d'appeler le SAMU (15).
3. CONTRE-INDICATIONS CLASSIQUES:
   - Ibuprofène (Advil, Nurofen) : INTERDIT si varicelle (risque de fasciite nécrosante) ou si déshydratation.
   - Aspirine : INTERDIT chez l'enfant pour la fièvre (risque de syndrome de Reye).
   - Moins de 3 mois : Toute fièvre nécessite une consultation médicale (danger).
4. VALIDATION ÂGE/POIDS: Si le rapport âge/poids te semble extrêmement anormal (ex: 2 ans et 4 kg), demande aux parents de vérifier le poids saisi.

SUIVI : Si le patient mentionne un symptôme à surveiller, tu DOIS lui demander : 'Voulez-vous que je prenne de vos nouvelles dans 2 heures ?' dans ton message. Mets 'requires_followup' à false et 'followup_time_minutes' à null. UNIQUEMENT si le patient a EXPLICITEMENT accepté un suivi dans son message (ex: 'oui', 'd'accord', 'dans 30 minutes'), mets 'requires_followup' à true, mets 'followup_time_minutes' au nombre de minutes convenu (utilise 120 s'il dit juste 'oui'), et rédige un 'followup_message'. Sinon mets 'requires_followup' à false et 'followup_time_minutes' à null.

FORMAT DE RÉPONSE STRICT (JSON UNIQUEMENT, AUCUN TEXTE AVANT NI APRÈS):
{
  "status": "normal" | "warning" | "danger",
  "risk": "low" | "medium" | "high",
  "dosage_guidance": "Conseil général de dosage sans chiffres exacts",
  "advice": ["Conseil 1", "Conseil 2"],
  "consult": "Quand consulter un médecin",
  "requires_followup": true,
  "followup_time_minutes": 120,
  "followup_message": "Message court pour prendre des nouvelles, ou null"
}
`;

class ChildSafetyService {
  /**
   * Vérifie basiquement si le rapport âge/poids est plausible
   */
  checkAgeWeightPlausibility(ageMonths, weightKg) {
    if (!ageMonths || !weightKg) return true; // on skip si manquant (géré par ailleurs)
    
    // Estimation grossière :
    // 0-3 mois: 2.5 - 7 kg
    // 12 mois: 7 - 12 kg
    // 24 mois (2 ans): 10 - 15 kg
    // 60 mois (5 ans): 14 - 22 kg
    
    // On lève une alerte seulement si c'est VRAIMENT incohérent
    if (ageMonths >= 12 && weightKg < 5) return false;
    if (ageMonths >= 24 && weightKg < 7) return false;
    if (ageMonths >= 60 && weightKg < 10) return false;
    if (ageMonths < 3 && weightKg > 15) return false;

    return true;
  }

  async analyze(input) {
    const { message, history = [], childProfile, medication, imageBase64 } = input;
    const ageMonths = childProfile?.age_months;
    const weightKg = childProfile?.weight_kg;

    let fdaInfo = null;
    let fdaText = '';

    if (medication) {
      try {
        fdaInfo = await OpenFdaClient.searchDrug(medication);
        if (fdaInfo.found) {
          fdaText = `
DONNÉES FDA POUR "${medication}":
- Usage Pédiatrique : ${fdaInfo.pediatricUse.join(' ') || 'Non précisé'}
- Dosage & Admin : ${fdaInfo.dosageAndAdministration.join(' ') || 'Non précisé'}
- Avertissements : ${fdaInfo.warnings.join(' ') || 'Non précisé'}
`;
        } else {
          fdaText = `\nAucune donnée FDA trouvée pour "${medication}". Applique les règles générales pédiatriques.\n`;
        }
      } catch (err) {
        console.error('ChildSafetyService FDA error:', err.message);
      }
    }

    const plausibilityWarning = this.checkAgeWeightPlausibility(ageMonths, weightKg)
      ? ''
      : '\nATTENTION: Le rapport âge/poids fourni semble incohérent (vérifiez avec le parent).\n';

    const prompt = `
PROFIL DE L'ENFANT:
- Âge : ${ageMonths ? ageMonths + ' mois' : 'Non précisé'}
- Poids : ${weightKg ? weightKg + ' kg' : 'Non précisé'}
${plausibilityWarning}
${fdaText}

MESSAGE DU PARENT : "${message}"
`;

    // Transformer l'historique pour Groq
    const mappedHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text || msg.content
    }));

    const userContent = [{ type: 'text', text: prompt }];
    if (imageBase64) {
      userContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } });
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...mappedHistory,
      { role: 'user', content: userContent }
    ];

    const raw = await llmClient.complete(messages, { 
      temperature: 0.3, 
      maxTokens: 1200,
    });
    
    let result;
    try {
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(cleaned);
    } catch (e) {
      console.error('ChildSafetyService JSON parse error:', raw, e);
      result = {
        status: 'warning',
        risk: 'medium',
        dosage_guidance: 'Impossible d\'analyser. Consultez un médecin.',
        advice: ['Veuillez reformuler votre question.'],
        consult: 'Consultez votre pédiatre en cas de doute.',
        requires_followup: false,
        followup_time_minutes: null,
        followup_message: null
      };
    }

    // On peut renvoyer aussi les données de profil validées
    return {
      ...result,
      meta: {
        ageMonths,
        weightKg,
        medicationChecked: medication || null,
        plausibleWeight: this.checkAgeWeightPlausibility(ageMonths, weightKg)
      }
    };
  }
}

module.exports = new ChildSafetyService();
