const { Resend } = require('resend');
const logger = require('../utils/logger');

// Criar cliente Resend apenas se tiver API key
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Log de aviso se não tiver API key
if (!resend) {
  logger.warn('⚠️ RESEND_API_KEY não configurada - Emails desabilitados');
}

module.exports = resend;