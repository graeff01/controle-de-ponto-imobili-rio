const backupService = require('../services/backupService');
const db = require('../config/database');
const logger = require('../utils/logger');

async function databaseBackup() {
  const startTime = Date.now();
  let status = 'success';
  let details = {};

  try {
    logger.info('💾 Iniciando backup automático do banco...');

    const backupResult = await backupService.generateBackup();
    const saved = await backupService.saveBackup(backupResult);
    const removed = await backupService.cleanOldBackups(7);

    details = {
      filename: saved.filename,
      size_bytes: saved.size_bytes,
      tables: saved.tables_count,
      records: saved.records_count,
      old_removed: removed
    };

    logger.info(`✅ Backup concluído: ${saved.filename} (${(saved.size_bytes / 1024).toFixed(1)} KB, ${saved.records_count} registros)`);

  } catch (error) {
    status = 'error';
    details = { error: error.message };
    logger.error('❌ Erro no backup automático', { error: error.message });
  }

  // Logar execução do job
  try {
    await db.query(
      `INSERT INTO system_jobs_log (job_name, status, details, duration_ms) VALUES ($1, $2, $3, $4)`,
      ['database_backup', status, JSON.stringify(details), Date.now() - startTime]
    );
  } catch (e) {
    logger.error('Erro ao logar job de backup', { error: e.message });
  }
}

module.exports = databaseBackup;
