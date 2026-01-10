const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('connect', () => {
  logger.success('🟢 Conectado ao PostgreSQL (Railway)');
});

pool.on('error', (err) => {
  logger.error('❌ Erro no pool do PostgreSQL', { error: err.message });
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('❌ Erro ao conectar no Railway', { error: err.message });
  } else {
    logger.success('🟢 Conectado!', {
      timestamp: res.rows[0].now
    });
  }
});

module.exports = pool;