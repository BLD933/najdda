const axios = require('axios');

class RxNavClient {
  constructor() {
    this.baseUrl = 'https://rxnav.nlm.nih.gov/REST';
  }

  /**
   * Obtient le RxCUI (identifiant) d'un médicament à partir de son nom
   */
  async getRxCUI(drugName) {
    try {
      const response = await axios.get(`${this.baseUrl}/rxcui.json`, {
        params: { name: drugName }
      });
      const rxnormId = response.data.idGroup?.rxnormId;
      if (rxnormId && rxnormId.length > 0) {
        return rxnormId[0];
      }
      return null;
    } catch (error) {
      console.error(`Erreur lors de la récupération du RxCUI pour ${drugName}:`, error.message);
      return null;
    }
  }

  /**
   * Récupère les interactions entre une liste de RxCUI
   * @param {string[]} rxcuiList - Liste des identifiants RxCUI
   */
  async getInteractions(rxcuiList) {
    if (!rxcuiList || rxcuiList.length < 2) {
      return []; // Pas d'interactions possibles avec 0 ou 1 médicament
    }

    const rxcuisParam = rxcuiList.join('+');
    
    try {
      const response = await axios.get(`${this.baseUrl}/interaction/list.json`, {
        params: { rxcuis: rxcuisParam }
      });

      const interactionTypeGroup = response.data.fullInteractionTypeGroup;
      if (!interactionTypeGroup) return [];

      let interactions = [];
      
      interactionTypeGroup.forEach(group => {
        group.fullInteractionType.forEach(interaction => {
          const drugs = interaction.minConcept.map(c => c.name);
          const description = interaction.interactionPair[0]?.description || "Interaction détectée";
          const severity = interaction.interactionPair[0]?.severity || "N/A";
          
          interactions.push({
            drugs: drugs,
            severity: severity,
            description: description
          });
        });
      });

      return interactions;
    } catch (error) {
      console.error(`Erreur lors de la récupération des interactions pour ${rxcuisParam}:`, error.message);
      return [];
    }
  }
}

module.exports = new RxNavClient();
