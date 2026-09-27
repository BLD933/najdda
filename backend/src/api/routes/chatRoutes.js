const express = require('express');
const chatController = require('../controllers/ChatController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
const { emergencyMiddleware } = require('../middlewares/emergencyMiddleware');

router.post('/message', authMiddleware, emergencyMiddleware, chatController.sendMessage);
router.post('/reset', authMiddleware, chatController.resetChat);
router.post('/vision', authMiddleware, emergencyMiddleware, chatController.analyzeImage.bind(chatController));

module.exports = router;
