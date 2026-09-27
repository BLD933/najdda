const DrugSafetyService = require('../../core/services/DrugSafetyService');
const chatPersistenceService = require('../../core/services/ChatPersistenceService');
const { getEmergencyNumber } = require('../middlewares/emergencyMiddleware');

class DrugController {
  async checkInteractions(req, res) {
    try {
      const { message, history, medications, imageBase64 } = req.body;

      if (!message && (!medications || medications.length === 0) && !imageBase64) {
        return res.status(400).json({ error: 'Veuillez fournir un message, une liste de médicaments, ou une image.' });
      }

      const result = await DrugSafetyService.checkInteraction({
        message: message || '',
        history: history || [],
        medications: medications || [],
        imageBase64
      });

      result.isEmergency = result.status === 'danger';
      if (result.isEmergency) result.emergencyNumber = getEmergencyNumber(req.user.profile?.country);
      await chatPersistenceService.recordExchange({
        userId: req.user.id,
        chatType: 'medications',
        message,
        imageAttached: Boolean(imageBase64),
        result,
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('DrugController Error:', error);
      res.status(500).json({ error: 'Erreur lors de l\'analyse des médicaments.' });
    }
  }
}

module.exports = new DrugController();
