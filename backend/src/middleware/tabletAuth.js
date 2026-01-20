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
      "SELECT value FROM system_config WHERE key = 'authorized_tablet_token'"
    );

    const authorizedToken = result.rows[0]?.value?.token;

    if (!authorizedToken) {
      // Se não houver token, permite apenas se for o token padrão para setup (opcional)
      // Por agora, bloqueia
      return res.status(403).json({
        success: false,
        error: 'Segurança do tablet não configurada no banco.'
      });
    }

    if (token !== authorizedToken) {
      return res.status(403).json({
        success: false,
        error: 'Dispositivo não autorizado.'
      });
    }

    next();
  } catch (error) {
    logger.error('Erro no tabletAuthMiddleware', { error: error.message });
    res.status(500).json({ error: 'Erro interno' });
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
