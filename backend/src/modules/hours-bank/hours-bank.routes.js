const express = require('express');
const router = express.Router();
const hoursBankController = require('./hours-bank.controller');
const authMiddleware = require('../../middleware/auth');
const checkRole = require('../../middleware/rbac');
const auditMiddleware = require('../../middleware/audit');

router.use(authMiddleware);

// Gestores e admins podem ver banco de horas
router.get(
  '/user/:userId',
  checkRole(['gestor', 'admin']),
  hoursBankController.getUserBalance
);

router.get(
  '/all',
  checkRole(['gestor', 'admin']),
  hoursBankController.getAllUsers
);

router.post(
  '/adjust',
  checkRole(['admin', 'gestor']),
  auditMiddleware('ADJUST', 'hours_bank'),
  hoursBankController.ajustarSaldo
);

module.exports = router;