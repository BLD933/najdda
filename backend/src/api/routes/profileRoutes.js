const express = require('express');
const profileController = require('../controllers/ProfileController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/constants', profileController.getConstants);
router.put('/', authMiddleware, profileController.update);

module.exports = router;
