const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { runOrchestrator } = require('../../core/orchestrator/graph');
const chatRepository = require('../../infra/repositories/ChatRepository');
const { emergencyMiddleware, getEmergencyNumber } = require('../middlewares/emergencyMiddleware');
const { detectReplyLanguage } = require('../../core/lib/language');

router.post('/chat', authMiddleware, emergencyMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const userId = req.user.id;
    const profile = req.user.profile || {};

    const recentMessages = await chatRepository.getMessages(userId, 'orchestrator', 20);

    const historyMessages = recentMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const calcAge = (dob) => {
        if (!dob) return undefined;
        const b = new Date(dob);
        if (Number.isNaN(b.getTime())) return undefined;
        const n = new Date();
        let age = n.getFullYear() - b.getFullYear();
        if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age -= 1;
        return age;
      };
    const patientProfile = {
      replyLanguage: detectReplyLanguage(message, profile.preferredLanguage),
      age: profile.age || calcAge(profile.dateOfBirth),
      gender: profile.gender,
      city: profile.city,
      country: profile.country,
      preferredLanguage: profile.preferredLanguage,
      chronicDiseases: profile.chronicDiseases,
      drugAllergies: profile.drugAllergies,
      isPregnant: profile.isPregnant,
      trimester: profile.trimester,
      hasChildren: profile.hasChildren,
      weight: profile.weight,
      height: profile.height,
      bloodType: profile.bloodType,
      smokingStatus: profile.smokingStatus,
      medications: profile.medications || [],
      currentMedication: req.body.medication || '',
      child: req.body.childProfile || {},
    };

    await chatRepository.addMessage(userId, 'orchestrator', 'user', message, {});

    const input = {
      messages: historyMessages,
      patientProfile,
      userMessage: message,
      activeAgents: [],
      subAgentResponses: {},
      errors: [],
    };

    const result = await runOrchestrator(input);

    const finalText = result.finalResponse?.text || "I'm sorry, I couldn't process your request.";
    const isEmergency = Boolean(
      result.finalResponse?.isEmergency ||
      result.finalResponse?.severity === 'CRITICAL' ||
      result.finalResponse?.status === 'danger'
    );
    const followupTimeMinutes = result.finalResponse?.followupTimeMinutes || null;
    const followupMessage = result.finalResponse?.followupMessage || null;
    const options = result.finalResponse?.options || null;
    // The mobile client dials this directly, so it must be present whenever isEmergency is.
    const emergencyNumber = isEmergency ? getEmergencyNumber(profile.country) : null;

    await chatRepository.addMessage(
      userId,
      'orchestrator',
      'assistant',
      finalText,
      {
        isEmergency,
        agentsUsed: result.finalResponse?.agentsUsed || [],
        domain: result.domain,
      }
    );

    res.json({
      reply: finalText,
      isEmergency,
      emergencyNumber,
      domain: result.domain,
      agentsUsed: result.finalResponse?.agentsUsed || [],
      followupTimeMinutes,
      followupMessage,
      options,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Orchestrator route error:', error.message);
    res.status(500).json({ message: 'Failed to process message via Orchestrator' });
  }
});

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const messages = await chatRepository.getMessages(userId, 'orchestrator', limit);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch history' });
  }
});

router.post('/reset', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    await chatRepository.clearMessages(userId, 'orchestrator');
    res.json({ message: 'Orchestrator conversation reset' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset conversation' });
  }
});

module.exports = router;
