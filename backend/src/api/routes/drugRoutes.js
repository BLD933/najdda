const express = require('express');
const router = express.Router();
const DrugController = require('../controllers/DrugController');
const authMiddleware = require('../middlewares/authMiddleware');
const { emergencyMiddleware } = require('../middlewares/emergencyMiddleware');

router.post('/check', authMiddleware, emergencyMiddleware, DrugController.checkInteractions);

module.exports = router;
