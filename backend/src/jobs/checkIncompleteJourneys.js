const cron = require('node-cron');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

// Roda todo dia às 19h para verificar jornadas incompletas
const scheduleIncompleteJourneysCheck = () => {
  cron.schedule('0 19 * * *', async () => {
    logger.info('🔍 Iniciando verificação de jornadas incompletas...');
    
    try {
      await notificationService.verificarJornadaIncompleta();
      logger.success('✅ Verificação de jornadas incompletas concluída');
    } catch (error) {
      logger.error('❌ Erro na verificação de jornadas incompletas', { error: error.message });
    }
  }, {
    timezone: 'America/Sao_Paulo'
  });

  logger.info('📅 Job de verificação de jornadas incompletas agendado (19h)');
};

module.exports = scheduleIncompleteJourneysCheck;
