if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { apiLimiter } = require('./middleware/rateLimiter');
const startAllJobs = require('./jobs');

// Importar rotas
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const timeRecordsRoutes = require('./modules/time-records/timeRecords.routes');
const adjustmentsRoutes = require('./modules/adjustments/adjustments.routes');
const alertsRoutes = require('./modules/alerts/alerts.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const migrationRoutes = require('./modules/admin/migration.routes');

// Inicializar Express
const app = express();

// Trust proxy para express-rate-limit funcionar no Railway
app.set('trust proxy', 1);

// ============================================
// MIDDLEWARES GLOBAIS
// ============================================

// Segurança
app.use(helmet());

// CORS
// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'https://jardimdolagoponto.up.railway.app', // ✅ Produção
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sem origin (como mobile apps ou curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      // Opcional: Permitir qualquer localhost em desenvolvimento
      if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// Rate limiting
app.use('/api/', apiLimiter);

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================
// ROTAS DA API
// ============================================
app.use('/api/tablet', require('./modules/tablet/tablet.routes'));
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/time-records', timeRecordsRoutes);
app.use('/api/adjustments', adjustmentsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/justifications', require('./modules/justifications/justifications.routes'));
app.use('/api/hours-bank', require('./modules/hours-bank/hours-bank.routes'));
app.use('/api/audit', require('./modules/audit/audit.routes'));
app.use('/api/duty-shifts', require('./modules/duty-shifts/dutyShifts.routes'));
app.use('/api/holidays', require('./modules/holidays/holidays.routes'));
app.use('/api/time-mirrors', require('./modules/time-mirrors/timeMirrors.routes')); // ✅ Nova rota Fase 6
app.use('/api/admin', migrationRoutes); // ✅ Rota para migrações

// ============================================
// ROTA 404
// ============================================
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// ============================================
// ERROR HANDLER (deve ser o último middleware)
// ============================================
app.use(errorHandler);

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================
const startServer = async () => {
  try {
    // Testa conexão com banco
    // 1. Criar system_config se não existir (necessário para configurações do sistema)
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        description TEXT,
        updated_by UUID,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 2. Garantir que a coluna terms_accepted_at existe em users
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP
    `);

    // 3. Garantir que o token do tablet existe
    await db.query(`
      INSERT INTO system_config (key, value, description)
      VALUES ('authorized_tablet_token', '{"token": "JDL-TOTEM-2026"}', 'Token de autenticação para o Totem/Tablet')
      ON CONFLICT (key) DO NOTHING
    `);

    logger.info('✅ Banco de dados: Tabelas e configurações verificadas');

    // Inicia jobs agendados
    if (process.env.NODE_ENV === 'production') {
      startAllJobs();
    } else {
      logger.info('⚠️ Jobs agendados desabilitados em desenvolvimento');
    }

    app.listen(
      Number(process.env.PORT) || 5000,
      '0.0.0.0',
      () => {
        logger.success(`Servidor rodando na porta ${process.env.PORT || 5000}`);
      }
    );

  } catch (error) {
    logger.error('❌ Erro ao iniciar servidor', { error: error.message });
    process.exit(1);
  }
};

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido. Encerrando gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido. Encerrando gracefully...');
  process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;
