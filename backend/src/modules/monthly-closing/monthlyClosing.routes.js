const express = require('express');
const router = express.Router();
const controller = require('./monthlyClosing.controller');
const authMiddleware = require('../../middleware/auth');
const checkRole = require('../../middleware/rbac');

router.use(authMiddleware);

// Verificar se um mês está fechado
router.get('/status/:year/:month', checkRole(['gestor', 'admin']), controller.getStatus);

// Listar todos os fechamentos
router.get('/', checkRole(['gestor', 'admin']), controller.listAll);

// Fechar um mês (apenas admin)
router.post('/close', checkRole(['admin']), controller.closeMonth);

// Reabrir um mês (apenas admin)
router.post('/reopen', checkRole(['admin']), controller.reopenMonth);

module.exports = router;
