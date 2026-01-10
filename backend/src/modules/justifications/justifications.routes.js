const express = require('express');
const router = express.Router();
const justificationsController = require('./justifications.controller');
const authMiddleware = require('../../middleware/auth');
const checkRole = require('../../middleware/rbac');
const upload = require('../../config/upload');
const auditMiddleware = require('../../middleware/audit');

router.use(authMiddleware);

// Gestores e admins podem gerenciar justificativas
router.post(
  '/',
  checkRole(['gestor', 'admin']),
  upload.single('document'),
  auditMiddleware('CREATE', 'justifications'),
  justificationsController.create
);

router.get(
  '/',
  checkRole(['gestor', 'admin']),
  justificationsController.getAll
);

router.get(
  '/document/:id',
  checkRole(['gestor', 'admin']),
  justificationsController.getDocument
);

router.delete(
  '/:id',
  checkRole(['admin']),
  auditMiddleware('DELETE', 'justifications'),
  justificationsController.delete
);

module.exports = router;