const chatRepository = require('../../infra/repositories/ChatRepository');

const CHAT_TYPES = new Set(['triage', 'pregnancy', 'allergy', 'children', 'medications']);

class ConversationController {
  async list(req, res) {
    const { chatType } = req.params;
    if (!CHAT_TYPES.has(chatType)) return res.status(400).json({ message: 'Unknown chat type' });
    const messages = await chatRepository.getMessages(req.user.id, chatType);
    res.json({ messages });
  }

  async clear(req, res) {
    const { chatType } = req.params;
    if (!CHAT_TYPES.has(chatType)) return res.status(400).json({ message: 'Unknown chat type' });
    await chatRepository.clearMessages(req.user.id, chatType);
    res.status(204).send();
  }
}

module.exports = new ConversationController();
