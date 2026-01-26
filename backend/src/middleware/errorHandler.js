const logger = require('../utils/logger');
const Sentry = require('@sentry/node');

const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log do erro
  logger.error('Erro de API', {
    message: err.message,
    stack: isProduction ? undefined : err.stack,
    path: req.path,
    method: req.method
  });

  // Erro de autenticação JWT
  if (err.name === 'UnauthorizedError' || err.message === 'Not authorized') {
    return res.status(401).json({
      status: 'error',
      code: 'unauthorized',
      message: 'Acesso não autorizado. Por favor, faça login novamente.'
    });
  }

  // Erro de validação do Joi
  if (err.isJoi) {
    return res.status(400).json({
      status: 'error',
      code: 'validation_error',
      message: 'Dados de entrada inválidos',
      details: err.details.map(detail => detail.message)
    });
  }

  // Erro do Multer (upload)
  if (err.name === 'MulterError') {
    const messages = {
      'LIMIT_FILE_SIZE': 'Arquivo muito grande. O limite é de 10MB.',
      'LIMIT_UNEXPECTED_FILE': 'Campo de upload inesperado.'
    };
    return res.status(400).json({
      status: 'error',
      code: 'upload_error',
      message: messages[err.code] || 'Erro ao processar o arquivo enviado.'
    });
  }

  // Erro de banco de dados (Constraint Violation)
  if (err.code && err.code.startsWith('23')) {
    return res.status(409).json({
      status: 'error',
      code: 'database_conflict',
      message: 'Não foi possível completar a operação devido a um conflito nos dados.',
      details: isProduction ? undefined : err.detail
    });
  }

  // Erro padrão
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    status: 'error',
    code: err.code || 'internal_error',
    message: isProduction && statusCode === 500
      ? 'Ocorreu um erro inesperado em nosso servidor. Nossa equipe já foi notificada.'
      : err.message || 'Erro interno do servidor'
  });
};

module.exports = errorHandler;
