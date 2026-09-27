const express = require('express');
const router = express.Router();
const allergyController = require('../controllers/AllergyController');

const authMiddleware = require('../middlewares/authMiddleware');
const { emergencyMiddleware } = require('../middlewares/emergencyMiddleware');

router.post('/check', authMiddleware, emergencyMiddleware, allergyController.analyze.bind(allergyController));

module.exports = router;
