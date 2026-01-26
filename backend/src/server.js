if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

// Inicializar Sentry (SEMPRE antes de outros imports se possível)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0,
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
    environment: process.env.NODE_ENV || 'development'
  });
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
// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'https://jardimdolagoponto.up.railway.app',
  'https://vibrant-reprieve-production.up.railway.app'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ""));
}

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sem origin (como mobile apps ou curl)
    if (!origin) return callback(null, true);

    // Limpar origin e allowedOrigins de barras finais para comparação segura
    const normalizedOrigin = origin.replace(/\/$/, "");

    const isAllowed = allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, "");
      return normalizedAllowed === normalizedOrigin ||
        (normalizedAllowed.includes('localhost') && normalizedOrigin.includes('localhost'));
    });

    if (isAllowed || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      logger.warn('CORS Blocked', { origin, normalizedOrigin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tablet-Token', 'X-Tablet-API-Key']
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
app.use('/api/time-mirrors', require('./modules/time-mirrors/timeMirrors.routes'));
app.use('/api/admin', migrationRoutes);

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

// The error handler must be registered before any other error middleware and after all controllers
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================
const startServer = async () => {
  try {
    // Testa conexão com banco
    await db.query('SELECT NOW()');
    logger.info('✅ Banco de dados conectado');

    // Inicia jobs agendados
    if (process.env.NODE_ENV === 'production') {
      startAllJobs();
      logger.info('🚀 Jobs agendados iniciados');
    } else {
      logger.info('⚠️ Jobs agendados desabilitados em desenvolvimento');
    }

    const port = Number(process.env.PORT) || 5000;
    app.listen(port, '0.0.0.0', () => {
      logger.success(`Servidor rodando na porta ${port}`);
    });

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
