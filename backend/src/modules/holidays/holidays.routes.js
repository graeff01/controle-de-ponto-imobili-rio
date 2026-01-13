const express = require('express');
const router = express.Router();
const holidaysController = require('./holidays.controller');
const authMiddleware = require('../../middleware/auth');
const checkRole = require('../../middleware/rbac');

router.use(authMiddleware);

// Apenas admins e gestores gerenciam feriados
router.post('/', checkRole(['admin', 'gestor']), holidaysController.create);
router.delete('/:id', checkRole(['admin', 'gestor']), holidaysController.delete);

// Todos podem ver (para mostrar no calendário/espelho)
router.get('/', holidaysController.getAll);

module.exports = router;
