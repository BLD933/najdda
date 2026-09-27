const express = require('express');
const router = express.Router();
const childController = require('../controllers/ChildController');
const authMiddleware = require('../middlewares/authMiddleware');
const { emergencyMiddleware } = require('../middlewares/emergencyMiddleware');

router.post('/check', authMiddleware, emergencyMiddleware, childController.check);

module.exports = router;
