const chatRepository = require('../../infra/repositories/ChatRepository');

function buildAssistantText(result) {
  const lines = [
    result.message,
    result.dosage_guidance,
    ...(Array.isArray(result.advice) ? result.advice.map((advice) => `• ${advice}`) : []),
    result.when_to_act,
    result.consult,
  ].filter(Boolean);
  const triageReply = result.reply
    ? result.reply
      .replace(/\[SEVERITY:\s*\w+\]/g, '')
      .replace(/\[REQUIRES_FOLLOWUP:\s*\w+\]/g, '')
      .replace(/\[FOLLOWUP_MSG:\s*.+?\]/g, '')
      .trim()
    : '';
  return lines.join('\n\n') || triageReply || 'Réponse médicale disponible.';
}

class ChatPersistenceService {
  async recordExchange({ userId, chatType, message, imageAttached = false, result }) {
    await chatRepository.addMessage(userId, chatType, 'user', message || '[Image jointe]', { imageAttached });
    await chatRepository.addMessage(userId, chatType, 'assistant', buildAssistantText(result), {
      isEmergency: Boolean(result.isEmergency),
      emergencyNumber: result.emergencyNumber || null,
      status: result.status || result.severity || null,
      risk: result.risk || null,
    });

  }
}

module.exports = new ChatPersistenceService();
