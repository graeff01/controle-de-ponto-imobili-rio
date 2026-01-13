const { Pool } = require('pg');
const logger = require('../utils/logger');

// Configuração do pool de conexões
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Número máximo de conexões no pool
  max: parseInt(process.env.DB_POOL_MAX) || 20,
  // Tempo máximo de espera por uma conexão (ms)
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
  // Tempo que uma conexão pode ficar ociosa antes de ser fechada (ms)
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  // Verificar conexões antes de usá-las
  allowExitOnIdle: false
};

// Adicionar SSL em produção (Railway requer SSL)
if (process.env.NODE_ENV === 'production') {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(poolConfig);

// Event listeners para monitoramento
pool.on('connect', (client) => {
  logger.info('🟢 Nova conexão ao PostgreSQL');
});

pool.on('acquire', (client) => {
  // Log opcional para debug de conexões
  // logger.debug('Conexão adquirida do pool');
});

pool.on('remove', (client) => {
  logger.info('🔴 Conexão removida do pool');
});

pool.on('error', (err, client) => {
  logger.error('❌ Erro no pool do PostgreSQL', {
    error: err.message,
    code: err.code
  });
});

// Healthcheck inicial
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('❌ Falha ao conectar no PostgreSQL', {
      error: err.message,
      host: process.env.DATABASE_URL ? 'Railway' : 'Local'
    });
  } else {
    logger.success('🟢 PostgreSQL conectado!', {
      timestamp: res.rows[0].now,
      poolSize: poolConfig.max
    });
  }
});

// Função de healthcheck para uso externo
pool.healthCheck = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    return {
      healthy: true,
      timestamp: result.rows[0].now,
      activeConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
};

module.exports = pool;