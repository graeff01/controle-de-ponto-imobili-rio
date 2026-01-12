const express = require('express');
const router = express.Router();
const dutyShiftsController = require('./dutyShifts.controller');
const authMiddleware = require('../../middleware/auth');
const checkRole = require('../../middleware/rbac');

// Rota pública para marcar presença (tablet)
router.post('/mark-presence', dutyShiftsController.markPresence);

// Rotas protegidas
router.use(authMiddleware);

router.get(
  '/today',
  checkRole(['gestor', 'admin']),
  dutyShiftsController.getTodayPresence
);

router.get(
  '/report/monthly/:year/:month',
  checkRole(['gestor', 'admin']),
  dutyShiftsController.getMonthlyReport
);

router.get(
  '/report/download/:year/:month',
  checkRole(['gestor', 'admin']),
  dutyShiftsController.downloadMonthlyReport
);

router.get(
  '/broker/:userId',
  checkRole(['gestor', 'admin']),
  dutyShiftsController.getBrokerShifts
);

router.get(
  '/stats/:userId',
  checkRole(['gestor', 'admin']),
  dutyShiftsController.getBrokerStats
);

module.exports = router;