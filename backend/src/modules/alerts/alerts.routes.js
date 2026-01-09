const express = require('express');
const router = express.Router();
const alertsController = require('./alerts.controller');
const authMiddleware = require('../../middleware/auth');
const checkRole = require('../../middleware/rbac');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Gestores e admins podem ver todos os alertas
router.get('/', checkRole(['gestor', 'admin']), alertsController.getAll);
router.get('/statistics', checkRole(['gestor', 'admin']), alertsController.getStatistics);
router.get('/:id', checkRole(['gestor', 'admin']), alertsController.getById);
router.patch('/:id/read', checkRole(['gestor', 'admin']), alertsController.markAsRead);
router.patch('/:id/dismiss', checkRole(['gestor', 'admin']), alertsController.dismiss);
router.post('/:id/resolve', checkRole(['gestor', 'admin']), alertsController.resolve);

module.exports = router;
