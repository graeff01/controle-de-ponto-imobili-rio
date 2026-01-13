const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

// API Key para autenticação dos tablets
// Em produção, gere uma chave segura e armazene no .env
const TABLET_API_KEY = process.env.TABLET_API_KEY || 'tablet-ponto-imobiliaria-2024';

// Lista de IPs autorizados (opcional - deixe vazia para permitir qualquer IP)
const ALLOWED_IPS = process.env.TABLET_ALLOWED_IPS 
  ? process.env.TABLET_ALLOWED_IPS.split(',').map(ip => ip.trim())
  : [];

/**
 * Middleware de autenticação para tablets
 * Requer header X-Tablet-API-Key com a API key válida
 */
const tabletAuthMiddleware = (req, res, next) => {
  try {
    const apiKey = req.headers['x-tablet-api-key'];
    const clientIp = req.ip || req.connection.remoteAddress;

    // Verificar API Key
    if (!apiKey) {
      logger.warn('Tentativa de acesso ao tablet sem API Key', { ip: clientIp });
      return res.status(401).json({
        success: false,
        error: 'API Key não fornecida. Header X-Tablet-API-Key é obrigatório.'
      });
    }

    if (apiKey !== TABLET_API_KEY) {
      logger.warn('Tentativa de acesso ao tablet com API Key inválida', { 
        ip: clientIp,
        providedKey: apiKey.substring(0, 10) + '...'
      });
      return res.status(401).json({
        success: false,
        error: 'API Key inválida'
      });
    }

    // Verificar IP (se lista de IPs autorizados estiver configurada)
    if (ALLOWED_IPS.length > 0 && !ALLOWED_IPS.includes(clientIp)) {
      logger.warn('Tentativa de acesso ao tablet de IP não autorizado', { 
        ip: clientIp,
        allowedIps: ALLOWED_IPS 
      });
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. IP não autorizado.'
      });
    }

    // Adicionar informações do tablet ao request
    req.tabletAuth = {
      authenticated: true,
      ip: clientIp,
      timestamp: new Date()
    };

    logger.info('Acesso tablet autenticado', { ip: clientIp });
    next();

  } catch (error) {
    logger.error('Erro no middleware de autenticação tablet', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Erro na autenticação do tablet'
    });
  }
};

/**
 * Rate limiter específico para tablets
 * Mais restritivo para evitar abusos
 */
const tabletRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requisições por minuto por IP
  message: {
    success: false,
    error: 'Muitas requisições do tablet. Aguarde um momento.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Usar IP + API Key para identificar o tablet
    return `${req.ip}-tablet`;
  }
});

/**
 * Rate limiter para registro de ponto (mais restritivo)
 * Evita registros duplicados acidentais
 */
const tabletRegisterLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // Máximo 5 registros por minuto
  message: {
    success: false,
    error: 'Muitas tentativas de registro. Aguarde 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  tabletAuthMiddleware,
  tabletRateLimiter,
  tabletRegisterLimiter
};
