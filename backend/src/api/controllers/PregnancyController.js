const pregnancySafetyService = require('../../core/services/PregnancySafetyService');
const chatPersistenceService = require('../../core/services/ChatPersistenceService');
const { getEmergencyNumber } = require('../middlewares/emergencyMiddleware');

class PregnancyController {
  async check(req, res) {
    try {
      const { pregnant, trimester, symptoms, medication, food, message, imageBase64 } = req.body;
      const profile = req.user.profile || {};

      const result = await pregnancySafetyService.analyze({
        pregnant,
        trimester,
        symptoms,
        medication,
        food,
        profile,
        userMessage: message,
        imageBase64,
      });

      result.isEmergency = result.status === 'danger';
      if (result.isEmergency) result.emergencyNumber = getEmergencyNumber(profile.country);
      await chatPersistenceService.recordExchange({
        userId: req.user.id,
        chatType: 'pregnancy',
        message,
        imageAttached: Boolean(imageBase64),
        result,
      });

      res.status(200).json(result);
    } catch (error) {
      const status = error.message.includes('profile') || error.message.includes('Provide at least')
        ? 400
        : error.message.includes('trimester') || error.message.includes('pregnant')
          ? 400
          : 500;

      console.error('Pregnancy check error:', error.message);
      res.status(status).json({ message: error.message || 'Failed to analyze pregnancy safety' });
    }
  }
}

module.exports = new PregnancyController();
