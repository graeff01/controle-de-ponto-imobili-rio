const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  
  // Log do erro
  logger.error('Erro capturado pelo error handler', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Erro de validação do Joi
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.details.map(detail => detail.message)
    });
  }

  // Erro do Multer (upload)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Arquivo muito grande. Tamanho máximo: 5MB'
      });
    }
    return res.status(400).json({
      error: 'Erro no upload do arquivo'
    });
  }

  // Erro de banco de dados
  if (err.code && err.code.startsWith('23')) {
    return res.status(409).json({
      error: 'Violação de constraint do banco de dados',
      details: err.detail
    });
  }

  // Erro padrão
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor'
  });
};

module.exports = errorHandler;
