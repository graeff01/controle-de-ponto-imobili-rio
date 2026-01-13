const express = require('express');
const router = express.Router();
const timeMirrorsController = require('./timeMirrors.controller');
const authMiddleware = require('../../middleware/auth');

router.use(authMiddleware);

// Rotas para o próprio funcionário
router.get('/', timeMirrorsController.getMyMirrors);
router.post('/generate', timeMirrorsController.generate);
router.post('/:id/sign', timeMirrorsController.sign);
router.get('/:id/pdf', timeMirrorsController.downloadPdf); // ✅ Rota de PDF

module.exports = router;
