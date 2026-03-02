const express = require('express');
const router = express.Router();
const termsController = require('./terms.controller');
const authMiddleware = require('../../middleware/auth');
const checkRole = require('../../middleware/rbac');

router.use(authMiddleware);

// Qualquer usuário autenticado pode aceitar e verificar status
router.post('/accept', termsController.acceptTerms);
router.get('/status', termsController.getStatus);

// Relatório de aceites - admin e gestor
router.get('/report', checkRole(['admin', 'gestor']), termsController.getReport);

// Download PDF do termo assinado - admin e gestor
router.get('/pdf/:userId', checkRole(['admin', 'gestor']), termsController.downloadPdf);

module.exports = router;
