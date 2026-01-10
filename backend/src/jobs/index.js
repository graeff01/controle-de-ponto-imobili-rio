const cron = require('node-cron');
const { checkLateArrivals, checkMissingExits } = require('./checkLateArrivals');
const logger = require('../utils/logger');

function startAllJobs() {
  logger.info('🕐 Iniciando jobs agendados...');

  // Verificar atrasos a cada 15 minutos (das 8h às 10h)
  cron.schedule('*/15 8-10 * * 1-5', async () => {
    logger.info('Executando verificação de atrasos...');
    await checkLateArrivals();
  });

  // Verificar saídas não registradas às 18:30 e 19:00
  cron.schedule('30,0 18-19 * * 1-5', async () => {
    logger.info('Executando verificação de saídas...');
    await checkMissingExits();
  });

  logger.success('✅ Jobs agendados iniciados');
}

module.exports = startAllJobs;