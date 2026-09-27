const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { runOrchestrator } = require('../../core/orchestrator/graph');
const chatRepository = require('../../infra/repositories/ChatRepository');
const { getEmergencyNumber } = require('../middlewares/emergencyMiddleware');

router.post('/chat', authMiddleware, async (req, res) => {
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

    const patientProfile = {
      age: profile.age || profile.dateOfBirth
        ? new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear()
        : undefined,
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
    const isEmergency = result.finalResponse?.isEmergency || false;
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
    console.error('Orchestrator route error:', error);
    res.status(500).json({ message: error.message || 'Failed to process message via Orchestrator' });
  }
});

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await chatRepository.getMessages(userId, 'orchestrator', 50);
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
