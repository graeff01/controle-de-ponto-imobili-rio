const rateLimit = require('express-rate-limit');
const db = require('../config/database');
const logger = require('../utils/logger');

// Middleware de Autenticação
const tabletAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers['x-tablet-token'] || req.headers['x-tablet-api-key'];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Acesso negado. Token do dispositivo não fornecido.'
      });
    }

    const result = await db.query(
      "SELECT id, name, device_type FROM authorized_devices WHERE token = $1",
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Dispositivo reconhecido como não autorizado.'
      });
    }

    // Anexar info do dispositivo na requisição
    req.device = result.rows[0];
    next();
  } catch (error) {
    logger.error('Erro no tabletAuthMiddleware', { error: error.message });
    res.status(500).json({ error: 'Erro interno ao validar dispositivo' });
  }
};

// Rate Limiter Geral para o Totem
const tabletRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Muitas requisições do Totem. Tente novamente em 15 minutos.' }
});

// Rate Limiter para Registro de Ponto (mais rigoroso)
const tabletRegisterLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Aguarde um momento antes de registrar novamente.' }
});

module.exports = {
  tabletAuthMiddleware,
  tabletRateLimiter,
  tabletRegisterLimiter
};
