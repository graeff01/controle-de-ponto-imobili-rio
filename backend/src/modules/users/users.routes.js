const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');

// ⚠️ ROTA PÚBLICA (para o tablet buscar usuário)
router.get('/matricula/:matricula', usersController.getByMatricula);

// Rotas (temporariamente SEM autenticação)
router.get('/', usersController.getAll);
router.get('/:id', usersController.getById);
router.post('/', usersController.create);
router.put('/:id', usersController.update);
router.post('/:id/deactivate', usersController.deactivate);

// DELETE comentado porque o método não existe no controller
// router.delete('/:id', usersController.delete);

module.exports = router;