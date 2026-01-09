const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const authMiddleware = require('../../middleware/auth');
const checkRole = require('../../middleware/rbac');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Gestores e admins podem acessar relatórios
router.get('/dashboard', checkRole(['gestor', 'admin']), reportsController.getDashboard);
router.get('/weekly', checkRole(['gestor', 'admin']), reportsController.getWeekly);
router.get('/monthly/:userId/:year/:month', checkRole(['gestor', 'admin']), reportsController.getMonthly);
router.get('/activity', checkRole(['gestor', 'admin']), reportsController.getActivity);

module.exports = router;
