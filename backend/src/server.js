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

// ============================================
// MIDDLEWARES GLOBAIS
// ============================================

// Configuração de CORS Segura
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
    'https://jardimdolagoponto.up.railway.app',
    'https://ponto-imobiliario.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir se não houver origin (como apps mobile ou chamadas diretas)
    if (!origin) return callback(null, true);

    // Verificar se a origem está na lista ou se estamos em desenvolvimento
    const isAllowed = allowedOrigins.some(ao => origin.startsWith(ao)) || process.env.NODE_ENV !== 'production';

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS REJECTED]: ${origin}`);
      callback(null, false); // Não permitir, mas sem estourar erro no preflight
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tablet-Token', 'X-Tablet-API-Key'],
  credentials: true,
  maxAge: 86400
}));


// Segurança (Ajustado para produção)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false // CSP padrão em produção
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
app.use('/api/monthly-closing', require('./modules/monthly-closing/monthlyClosing.routes'));
app.use('/api/espelho', require('./modules/espelho/espelho.routes'));
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
