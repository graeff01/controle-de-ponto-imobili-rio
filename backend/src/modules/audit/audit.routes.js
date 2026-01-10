const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');
const authMiddleware = require('../../middleware/auth');
const checkRole = require('../../middleware/rbac');

router.use(authMiddleware);

// Apenas admins podem ver logs de auditoria
router.get(
  '/',
  checkRole(['admin']),
  auditController.getLogs
);

router.get(
  '/:table_name/:record_id',
  checkRole(['admin']),
  auditController.getRecordHistory
);

module.exports = router;