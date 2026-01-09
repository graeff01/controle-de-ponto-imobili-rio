const cron = require('node-cron');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

// Roda toda sexta-feira às 18h para verificar excesso de horas na semana
const scheduleExcessHoursCheck = () => {
  cron.schedule('0 18 * * 5', async () => {
    logger.info('🔍 Iniciando verificação de excesso de horas...');
    
    try {
      await notificationService.verificarExcessoHoras();
      logger.success('✅ Verificação de excesso de horas concluída');
    } catch (error) {
      logger.error('❌ Erro na verificação de excesso de horas', { error: error.message });
    }
  }, {
    timezone: 'America/Sao_Paulo'
  });

  logger.info('📅 Job de verificação de excesso de horas agendado (Sexta 18h)');
};

module.exports = scheduleExcessHoursCheck;
