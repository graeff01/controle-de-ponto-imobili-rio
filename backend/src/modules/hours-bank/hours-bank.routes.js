const express = require('express');
const router = express.Router();
const hoursBankController = require('./hours-bank.controller');
const authMiddleware = require('../../middleware/auth');

router.use(authMiddleware);

// ✅ REMOVIDO checkRole temporariamente para debug
router.get('/user/:userId', hoursBankController.getUserBalance);
router.get('/all', hoursBankController.getAllUsers);
router.post('/adjust', hoursBankController.ajustarSaldo);

module.exports = router;