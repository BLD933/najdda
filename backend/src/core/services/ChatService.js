const triageAgent = require('./agents/TriageAgent');
const chatRepository = require('../../infra/repositories/ChatRepository');

class ChatService {
  async getConversation(userId) {
    const messages = await chatRepository.getMessages(userId, 'triage');
    return messages.map((message) => ({ role: message.role, content: message.content }));
  }

  async sendMessage(userId, message, profile = {}) {
    const history = await this.getConversation(userId);
    history.push({ role: 'user', content: message });
    const reply = await triageAgent.assess(history, profile);
    const severity = triageAgent.getSeverity(reply);
    return { reply, severity };
  }

  async *sendMessageStream(userId, message, profile = {}) {
    const history = await this.getConversation(userId);
    history.push({ role: 'user', content: message });

    let fullContent = '';
    for await (const chunk of triageAgent.streamAssess(history, profile)) {
      if (typeof chunk === 'string') {
        fullContent += chunk;
        yield { type: 'token', content: chunk };
      } else {
        yield { 
          type: 'done', 
          severity: chunk.severity, 
          requires_followup: chunk.requires_followup, 
          followup_message: chunk.followup_message,
          options: chunk.options,
          fullContent,
        };
      }
    }
  }

  async resetConversation(userId) {
    await chatRepository.clearMessages(userId, 'triage');
  }
}

module.exports = new ChatService();
