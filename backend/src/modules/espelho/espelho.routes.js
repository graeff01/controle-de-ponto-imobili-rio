const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const controller = require('./espelho.controller');

// Rate limiter para rotas públicas do espelho
const espelhoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // 30 requisições por IP
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' }
});

const signLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 assinaturas por IP por hora
  message: { error: 'Limite de assinaturas atingido. Tente novamente mais tarde.' }
});

router.use(espelhoLimiter);

// Verificar matrícula e retornar nome do funcionário
router.post('/verificar', controller.verificarMatricula);

// Visualizar espelho de ponto do mês
router.post('/visualizar', controller.visualizarEspelho);

// Assinar espelho de ponto (rate limit extra)
router.post('/assinar', signLimiter, controller.assinarEspelho);

// Verificar se já assinou
router.post('/status', controller.statusAssinatura);

module.exports = router;
