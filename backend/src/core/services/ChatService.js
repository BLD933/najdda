const triageAgent = require('./agents/TriageAgent');
const chatRepository = require('../../infra/repositories/ChatRepository');
const { detectReplyLanguage } = require('../lib/language');

class ChatService {
  withReplyLanguage(message, profile = {}) {
    return { ...profile, replyLanguage: detectReplyLanguage(message, profile.preferredLanguage) };
  }

  async getConversation(userId) {
    const messages = await chatRepository.getMessages(userId, 'triage');
    return messages.map((message) => ({ role: message.role, content: message.content }));
  }

  async sendMessage(userId, message, profile = {}) {
    const history = await this.getConversation(userId);
    history.push({ role: 'user', content: message });
    const reply = await triageAgent.assess(history, this.withReplyLanguage(message, profile));
    const severity = triageAgent.getSeverity(reply);
    return { reply, severity };
  }

  async *sendMessageStream(userId, message, profile = {}) {
    const history = await this.getConversation(userId);
    history.push({ role: 'user', content: message });
    const localized = this.withReplyLanguage(message, profile);

    let fullContent = '';
    for await (const chunk of triageAgent.streamAssess(history, localized)) {
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
          fullContent: chunk.fullContent ?? fullContent,
        };
      }
    }
  }

  async resetConversation(userId) {
    await chatRepository.clearMessages(userId, 'triage');
  }
}

module.exports = new ChatService();
