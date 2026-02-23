const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const authMiddleware = require('../../middleware/auth');
const rolesMiddleware = require('../../middleware/roles');

// ✅ Rota para buscar próxima matrícula (ANTES das outras rotas)
router.get('/next-matricula', authMiddleware, usersController.getNextMatricula);

// ✅ Rota para buscar próxima matrícula de corretor
router.get('/next-matricula-broker', authMiddleware, usersController.getNextBrokerMatricula);

// ✅ Rota para buscar próxima matrícula de admin
router.get('/next-matricula-admin', authMiddleware, usersController.getNextAdminMatricula);

// ✅ Rota para buscar próxima matrícula de gestor
router.get('/next-matricula-manager', authMiddleware, usersController.getNextManagerMatricula);

// ✅ Buscar por matrícula (específica)
router.get('/matricula/:matricula', usersController.getByMatricula);

// ✅ Listar todos (Admin e Gestor)
router.get('/', authMiddleware, rolesMiddleware.isManagerOrAdmin, usersController.getAll);

// ✅ Criar novo (Apenas Admin)
router.post('/', authMiddleware, rolesMiddleware.isAdmin, usersController.create);

// ✅ Atualizar (Apenas Admin)
router.put('/:id', authMiddleware, rolesMiddleware.isAdmin, usersController.update);

// ✅ Desativar (Apenas Admin)
router.post('/:id/deactivate', authMiddleware, rolesMiddleware.isAdmin, usersController.deactivate);

// ✅ Excluir (Soft delete) (Apenas Admin)
router.delete('/:id', authMiddleware, rolesMiddleware.isAdmin, usersController.delete);

// ✅ Reativar (Apenas Admin)
router.post('/:id/reactivate', authMiddleware, rolesMiddleware.isAdmin, usersController.reactivate);

// ✅ Aceitar termos de uso
router.post('/:id/accept-terms', usersController.acceptTerms);

module.exports = router;