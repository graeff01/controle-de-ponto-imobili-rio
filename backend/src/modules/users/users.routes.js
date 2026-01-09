const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const authMiddleware = require('../../middleware/auth');
const checkRole = require('../../middleware/rbac');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas públicas (autenticado)
router.get('/statistics', usersController.getStatistics);
router.get('/matricula/:matricula', usersController.getByMatricula);

// Rotas que requerem role de gestor ou admin
router.get('/', checkRole(['gestor', 'admin']), usersController.getAll);
router.get('/:id', checkRole(['gestor', 'admin']), usersController.getById);
router.post('/', checkRole(['admin']), usersController.create);
router.put('/:id', checkRole(['admin']), usersController.update);
router.post('/:id/assign-role', checkRole(['admin']), usersController.assignRole);
router.post('/:id/remove-role', checkRole(['admin']), usersController.removeRole);
router.post('/:id/deactivate', checkRole(['admin']), usersController.deactivate);

module.exports = router;
