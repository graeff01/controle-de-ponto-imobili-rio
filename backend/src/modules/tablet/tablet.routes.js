const express = require('express');
const router = express.Router();
const tabletController = require('./tablet.controller');
const upload = require('../../config/upload');

// ROTAS PÚBLICAS - SEM AUTENTICAÇÃO
router.get('/user/matricula/:matricula', tabletController.getByMatricula);
router.post('/record', upload.single('photo'), tabletController.registerRecord);
router.post('/register', tabletController.register); // ← ADICIONAR ESTA LINHA

module.exports = router;
