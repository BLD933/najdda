const express = require('express');
const pregnancyController = require('../controllers/PregnancyController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
const { emergencyMiddleware } = require('../middlewares/emergencyMiddleware');

router.post('/check', authMiddleware, emergencyMiddleware, pregnancyController.check);

module.exports = router;
