const allergyService = require('../../core/services/AllergyAnalyzerService');
const chatPersistenceService = require('../../core/services/ChatPersistenceService');
const { getEmergencyNumber } = require('../middlewares/emergencyMiddleware');

class AllergyController {
  async analyze(req, res) {
    try {
      const { symptoms, message, history, city, imageBase64 } = req.body;

      if (!message && (!symptoms || symptoms.length === 0) && !imageBase64) {
        return res.status(400).json({ error: "Veuillez fournir un message, des symptômes, ou une image." });
      }

      const result = await allergyService.check({
        symptoms,
        message,
        history,
        city: city || 'Fes',
        imageBase64
      });

      result.isEmergency = result.status === 'danger';
      if (result.isEmergency) result.emergencyNumber = getEmergencyNumber(req.user.profile?.country);
      await chatPersistenceService.recordExchange({
        userId: req.user.id,
        chatType: 'allergy',
        message,
        imageAttached: Boolean(imageBase64),
        result,
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('AllergyController Error:', error);
      res.status(500).json({
        error: "Erreur lors de l'analyse des allergies",
        details: error.message
      });
    }
  }
}

module.exports = new AllergyController();
