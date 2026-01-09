const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const logger = require('../utils/logger');

async function runMigrations() {
  try {
    logger.info('🚀 Iniciando migrations...');

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        logger.info(`Executando migration: `);
        
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await db.query(sql);
        
        logger.success(`✅ Migration  executada com sucesso`);
      }
    }

    logger.success('✅ Todas as migrations foram executadas!');
    process.exit(0);

  } catch (error) {
    logger.error('❌ Erro ao executar migrations', { error: error.message });
    process.exit(1);
  }
}

runMigrations();
