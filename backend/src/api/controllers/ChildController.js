const childSafetyService = require('../../core/services/ChildSafetyService');
const chatPersistenceService = require('../../core/services/ChatPersistenceService');
const { getEmergencyNumber } = require('../middlewares/emergencyMiddleware');

class ChildController {
  async check(req, res) {
    try {
      const { message, history, childProfile, medication, imageBase64 } = req.body;

      if (!message && !imageBase64) {
        return res.status(400).json({ error: 'Message ou image est requis.' });
      }

      const result = await childSafetyService.analyze({
        message,
        history,
        childProfile,
        medication,
        imageBase64
      });

      result.isEmergency = result.status === 'danger';
      if (result.isEmergency) result.emergencyNumber = getEmergencyNumber(req.user.profile?.country);
      await chatPersistenceService.recordExchange({
        userId: req.user.id,
        chatType: 'children',
        message,
        imageAttached: Boolean(imageBase64),
        result,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('ChildController error:', error);
      return res.status(500).json({ error: 'Erreur lors de l\'analyse pédiatrique.' });
    }
  }
}

module.exports = new ChildController();
