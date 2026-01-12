const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const authMiddleware = require('../../middleware/auth');

router.use(authMiddleware);

router.get('/dashboard', reportsController.getDashboard);
router.get('/weekly', reportsController.getWeekly);
router.get('/activity', reportsController.getActivity);

// ✅ ROTAS DE RELATÓRIO MENSAL
router.get('/monthly/individual/:userId/:year/:month', reportsController.getMonthlyIndividual);
router.get('/monthly/clt/:year/:month', reportsController.getMonthlyCLT);
router.get('/monthly/plantonistas/:year/:month', reportsController.getMonthlyPlantonistas);

module.exports = router;