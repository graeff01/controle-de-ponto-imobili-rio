const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const tabletController = require('./tablet.controller');
const upload = require('../../config/upload');
const {
    tabletAuthMiddleware,
    tabletRateLimiter,
    tabletRegisterLimiter
} = require('../../middleware/tabletAuth');

const validateDeviceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Muitas tentativas de validação. Aguarde 15 minutos.' }
});

// Rota de validação de dispositivo (usada no setup)
router.get('/validate-device/:token', validateDeviceLimiter, tabletController.validateDevice);

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
router.post('/external-register', upload.single('photo'), tabletRegisterLimiter, tabletController.externalRegister);


module.exports = router;
