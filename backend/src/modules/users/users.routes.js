const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const authMiddleware = require('../../middleware/auth');

// ✅ Rota para buscar próxima matrícula (ANTES das outras rotas)
router.get('/next-matricula', authMiddleware, usersController.getNextMatricula);

// ✅ Rota para buscar próxima matrícula de corretor
router.get('/next-matricula-broker', authMiddleware, usersController.getNextBrokerMatricula);

// ✅ Rota para buscar próxima matrícula de admin
router.get('/next-matricula-admin', authMiddleware, usersController.getNextAdminMatricula);

// ✅ Buscar por matrícula (específica)
router.get('/matricula/:matricula', usersController.getByMatricula);

// ✅ Listar todos
router.get('/', authMiddleware, usersController.getAll);

// ✅ Criar novo
router.post('/', authMiddleware, usersController.create);

// ✅ Atualizar
router.put('/:id', authMiddleware, usersController.update);

// ✅ Desativar
router.post('/:id/deactivate', authMiddleware, usersController.deactivate);

// ✅ Reativar
router.post('/:id/reactivate', authMiddleware, usersController.reactivate);

module.exports = router;