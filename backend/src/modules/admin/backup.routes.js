const express = require('express');
const router = express.Router();
const backupService = require('../../services/backupService');
const logger = require('../../utils/logger');
const authMiddleware = require('../../middleware/auth');
const checkRole = require('../../middleware/rbac');

router.use(authMiddleware);
router.use(checkRole(['admin']));

// Listar backups
router.get('/', async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    res.json({ success: true, data: backups });
  } catch (error) {
    logger.error('Erro ao listar backups', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Gerar backup manual
router.post('/now', async (req, res) => {
  try {
    logger.info(`Backup manual solicitado pelo Admin ID: ${req.userId}`);
    const result = await backupService.generateBackup();
    const saved = await backupService.saveBackup(result);
    res.json({
      success: true,
      message: 'Backup gerado com sucesso',
      data: saved
    });
  } catch (error) {
    logger.error('Erro ao gerar backup manual', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download de backup
router.get('/:id/download', async (req, res) => {
  try {
    const backup = await backupService.getBackup(parseInt(req.params.id));
    if (!backup) {
      return res.status(404).json({ success: false, error: 'Backup não encontrado' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.filename.replace('.gz', '')}"`);
    res.send(backup.backup_data);
  } catch (error) {
    logger.error('Erro ao baixar backup', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Limpar backups antigos manualmente
router.delete('/clean', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const removed = await backupService.cleanOldBackups(days);
    res.json({ success: true, message: `${removed} backup(s) removido(s)` });
  } catch (error) {
    logger.error('Erro ao limpar backups', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
