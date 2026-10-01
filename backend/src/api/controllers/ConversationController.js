const chatRepository = require('../../infra/repositories/ChatRepository');

const CHAT_TYPES = new Set(['triage', 'pregnancy', 'allergy', 'children', 'medications', 'orchestrator']);

class ConversationController {
  async list(req, res) {
    try {
      const { chatType } = req.params;
      if (!CHAT_TYPES.has(chatType)) return res.status(400).json({ message: 'Unknown chat type' });
      const messages = await chatRepository.getMessages(req.user.id, chatType);
      res.json({ messages });
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch conversation' });
    }
  }

  async clear(req, res) {
    try {
      const { chatType } = req.params;
      if (!CHAT_TYPES.has(chatType)) return res.status(400).json({ message: 'Unknown chat type' });
      await chatRepository.clearMessages(req.user.id, chatType);
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ message: 'Failed to clear conversation' });
    }
  }
}

module.exports = new ConversationController();
