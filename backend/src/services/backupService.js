const db = require('../config/database');
const logger = require('../utils/logger');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const TABLES_TO_BACKUP = [
  { name: 'users', exclude: ['password_hash', 'reset_password_token'] },
  { name: 'time_records', exclude: ['photo_data'] },
  { name: 'duty_shifts', exclude: ['photo_data', 'photo'] },
  { name: 'hours_bank' },
  { name: 'adjustments' },
  { name: 'holidays' },
  { name: 'manager_subordinates' },
  { name: 'devices' },
  { name: 'espelho_signatures', exclude: ['signature_data'] },
  { name: 'terms_acceptances', exclude: ['signature_data', 'pdf_data'] },
  { name: 'monthly_closing' },
  { name: 'alerts' },
  { name: 'audit_logs' }
];

class BackupService {

  async generateBackup() {
    const backupData = {};
    let totalRecords = 0;
    let tablesCount = 0;

    for (const table of TABLES_TO_BACKUP) {
      try {
        // Verificar se tabela existe
        const exists = await db.query(
          `SELECT 1 FROM information_schema.tables WHERE table_name = $1`,
          [table.name]
        );
        if (exists.rows.length === 0) continue;

        // Buscar colunas (excluindo as listadas)
        const colsResult = await db.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
          [table.name]
        );
        const excludeList = table.exclude || [];
        const columns = colsResult.rows
          .map(r => r.column_name)
          .filter(c => !excludeList.includes(c));

        const colsStr = columns.map(c => `"${c}"`).join(', ');
        const result = await db.query(`SELECT ${colsStr} FROM "${table.name}"`);

        backupData[table.name] = result.rows;
        totalRecords += result.rows.length;
        tablesCount++;

        logger.info(`Backup: ${table.name} - ${result.rows.length} registros`);
      } catch (err) {
        logger.error(`Backup: erro ao exportar ${table.name}`, { error: err.message });
      }
    }

    return { data: backupData, tablesCount, totalRecords };
  }

  async saveBackup(backupResult) {
    const jsonStr = JSON.stringify(backupResult.data);
    const compressed = await gzip(Buffer.from(jsonStr, 'utf-8'));

    const now = new Date();
    const filename = `backup_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.json.gz`;

    const result = await db.query(
      `INSERT INTO database_backups (filename, size_bytes, tables_count, records_count, backup_data)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, filename, size_bytes, tables_count, records_count, created_at`,
      [filename, compressed.length, backupResult.tablesCount, backupResult.totalRecords, compressed]
    );

    return result.rows[0];
  }

  async listBackups() {
    const result = await db.query(
      `SELECT id, filename, size_bytes, tables_count, records_count, created_at
       FROM database_backups ORDER BY created_at DESC LIMIT 30`
    );
    return result.rows;
  }

  async getBackup(id) {
    const result = await db.query(
      `SELECT * FROM database_backups WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const decompressed = await gunzip(row.backup_data);
    return {
      ...row,
      backup_data: decompressed
    };
  }

  async cleanOldBackups(keepDays = 7) {
    const result = await db.query(
      `DELETE FROM database_backups WHERE created_at < NOW() - INTERVAL '1 day' * $1 RETURNING id`,
      [keepDays]
    );
    const count = result.rowCount;
    if (count > 0) {
      logger.info(`Backup: ${count} backup(s) antigo(s) removido(s)`);
    }
    return count;
  }
}

module.exports = new BackupService();
