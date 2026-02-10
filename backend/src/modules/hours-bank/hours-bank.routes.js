const express = require('express');
const router = express.Router();
const hoursBankController = require('./hours-bank.controller');
const authMiddleware = require('../../middleware/auth');
const checkRole = require('../../middleware/rbac');

router.use(authMiddleware);

router.get('/user/:userId', checkRole(['gestor', 'admin']), hoursBankController.getUserBalance);
router.get('/all', checkRole(['gestor', 'admin']), hoursBankController.getAllUsers);
router.post('/adjust', checkRole(['gestor', 'admin']), hoursBankController.ajustarSaldo);

module.exports = router;