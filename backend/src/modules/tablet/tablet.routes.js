const express = require('express');
const router = express.Router();
const tabletController = require('./tablet.controller');
const upload = require('../../config/upload');
const {
    tabletAuthMiddleware,
    tabletRateLimiter,
    tabletRegisterLimiter
} = require('../../middleware/tabletAuth');

// Rota de validação de dispositivo (usada no setup)
// Não passa pelo middleware de auth padrão pois o token ainda não está salvo no cliente
router.get('/validate-device/:token', tabletController.validateDevice);

// Aplicar autenticação e rate limiting a todas as rotas
router.use(tabletAuthMiddleware);
router.use(tabletRateLimiter);

// Consultar usuário por matrícula
router.get('/user/matricula/:matricula', tabletController.getByMatricula);

// Verificar tipo de usuário (CLT ou Plantonista)
router.get('/user/type/:matricula', tabletController.checkUserType);

// Registrar ponto (com rate limiting adicional)
router.post('/register', tabletRegisterLimiter, tabletController.register);
router.post('/request-adjustment', tabletRegisterLimiter, tabletController.requestAdjustment);


module.exports = router;
