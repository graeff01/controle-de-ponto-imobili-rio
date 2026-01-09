const express = require('express');
const router = express.Router();
const adjustmentsController = require('./adjustments.controller');
const authMiddleware = require('../../middleware/auth');
const checkRole = require('../../middleware/rbac');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Apenas gestores e admins podem criar ajustes
router.post('/', checkRole(['gestor', 'admin']), adjustmentsController.create);

// Gestores e admins podem ver todos os ajustes
router.get('/', checkRole(['gestor', 'admin']), adjustmentsController.getAll);
router.get('/user/:userId', checkRole(['gestor', 'admin']), adjustmentsController.getByUser);

module.exports = router;
