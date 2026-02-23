const express = require('express');
const router = express.Router();
const controller = require('./espelho.controller');

// Rotas PÚBLICAS - não requerem autenticação JWT
// O funcionário acessa com matrícula apenas

// Verificar matrícula e retornar nome do funcionário
router.post('/verificar', controller.verificarMatricula);

// Visualizar espelho de ponto do mês
router.post('/visualizar', controller.visualizarEspelho);

// Assinar espelho de ponto
router.post('/assinar', controller.assinarEspelho);

// Verificar se já assinou
router.post('/status', controller.statusAssinatura);

module.exports = router;
