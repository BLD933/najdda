const express = require('express');
const conversationController = require('../controllers/ConversationController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.get('/:chatType', authMiddleware, conversationController.list.bind(conversationController));
router.delete('/:chatType', authMiddleware, conversationController.clear.bind(conversationController));

module.exports = router;
