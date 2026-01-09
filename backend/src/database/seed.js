const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const logger = require('../utils/logger');

async function runSeeds() {
  try {
    logger.info('🌱 Iniciando seeds...');

    const seedsDir = path.join(__dirname, 'seeds');
    const files = fs.readdirSync(seedsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        logger.info(`Executando seed: `);
        
        const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
        await db.query(sql);
        
        logger.success(`✅ Seed  executado com sucesso`);
      }
    }

    logger.success('✅ Todos os seeds foram executados!');
    process.exit(0);

  } catch (error) {
    logger.error('❌ Erro ao executar seeds', { error: error.message });
    process.exit(1);
  }
}

runSeeds();
