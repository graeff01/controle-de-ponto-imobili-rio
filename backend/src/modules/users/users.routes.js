const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const usersController = require('./users.controller');
const authMiddleware = require('../../middleware/auth');
const rolesMiddleware = require('../../middleware/roles');

const acceptTermsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' }
});

// ✅ Rota para buscar próxima matrícula (ANTES das outras rotas)
router.get('/next-matricula', authMiddleware, usersController.getNextMatricula);

// ✅ Rota para buscar próxima matrícula de corretor
router.get('/next-matricula-broker', authMiddleware, usersController.getNextBrokerMatricula);

// ✅ Rota para buscar próxima matrícula de admin
router.get('/next-matricula-admin', authMiddleware, usersController.getNextAdminMatricula);

// ✅ Rota para buscar próxima matrícula de gestor
router.get('/next-matricula-manager', authMiddleware, usersController.getNextManagerMatricula);

// Buscar por matrícula (requer autenticação)
router.get('/matricula/:matricula', authMiddleware, usersController.getByMatricula);

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

// Aceitar termos de uso (rate limited, UUID validado)
router.post('/:id/accept-terms', acceptTermsLimiter, usersController.acceptTerms);

module.exports = router;