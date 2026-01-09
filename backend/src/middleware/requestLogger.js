const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    if (res.statusCode >= 400) {
      logger.warn('Requisição com erro', logData);
    } else {
      logger.info('Requisição processada', logData);
    }
  });

  next();
};

module.exports = requestLogger;
