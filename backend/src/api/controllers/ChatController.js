const chatService = require('../../core/services/ChatService');
const visionService = require('../../core/services/VisionAnalyzerService');
const chatPersistenceService = require('../../core/services/ChatPersistenceService');
const { getEmergencyNumber } = require('../middlewares/emergencyMiddleware');

class ChatController {
  async sendMessage(req, res) {
    try {
      const { message, stream } = req.body;
      const userId = req.user.id;

      if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Message is required' });
      }

      const profile = req.user.profile || {};

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        for await (const event of chatService.sendMessageStream(userId, message, profile)) {
          if (event.type === 'token') {
            res.write(`data: ${JSON.stringify({ type: 'token', content: event.content })}\n\n`);
          } else if (event.type === 'done') {
            const isEmergency = event.severity === 'CRITICAL';
            const emergencyNumber = isEmergency ? getEmergencyNumber(profile.country) : null;
            await chatPersistenceService.recordExchange({
              userId,
              chatType: 'triage',
              message,
              result: {
                reply: event.fullContent,
                severity: event.severity,
                isEmergency,
                emergencyNumber,
                requires_followup: event.requires_followup,
                followup_message: event.followup_message,
                options: event.options,
              },
            });
            res.write(`data: ${JSON.stringify({ 
              type: 'done', 
              severity: event.severity,
              isEmergency,
              emergencyNumber,
              requires_followup: event.requires_followup,
              followup_message: event.followup_message,
              options: event.options
            })}\n\n`);
          }
        }

        res.end();
      } else {
        const result = await chatService.sendMessage(userId, message, profile);
        result.isEmergency = result.severity === 'CRITICAL';
        if (result.isEmergency) result.emergencyNumber = getEmergencyNumber(profile.country);
        await chatPersistenceService.recordExchange({ userId, chatType: 'triage', message, result });
        res.json(result);
      }
    } catch (error) {
      console.error('Chat error:', error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: error.message || 'Failed to process message' });
      }
    }
  }

  async resetChat(req, res) {
    try {
      const userId = req.user.id;
      await chatService.resetConversation(userId);
      res.json({ message: 'Conversation reset' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to reset conversation' });
    }
  }

  async analyzeImage(req, res) {
    try {
      const { imageBase64, message } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ message: 'Image is required' });
      }
      
      const profile = req.user.profile || {};
      const result = await visionService.analyze(imageBase64, message, profile);
      if (result.isEmergency) result.emergencyNumber = getEmergencyNumber(profile.country);
      await chatPersistenceService.recordExchange({
        userId: req.user.id,
        chatType: 'triage',
        message,
        imageAttached: true,
        result,
      });
      res.json(result);
    } catch (error) {
      console.error('Vision error:', error);
      res.status(500).json({ message: error.message || 'Failed to analyze image' });
    }
  }
}

module.exports = new ChatController();
