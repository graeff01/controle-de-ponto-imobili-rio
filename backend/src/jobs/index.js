const cron = require('node-cron');
const { checkLateArrivals, checkMissingExits } = require('./checkLateArrivals');
const dailyClosing = require('./dailyClosing'); // ✅ Novo job Fase 4
const runWeeklyDigest = require('./weeklyDigest');
const logger = require('../utils/logger');

function startAllJobs() {
  logger.info('🕐 Iniciando jobs agendados...');

  // Digest Semanal Automático (Domingo 20:00)
  cron.schedule('0 20 * * 0', async () => {
    logger.info('Executando digest semanal...');
    await runWeeklyDigest();
  });

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

  // Fechamento Diário do Banco de Horas (23:55)
  cron.schedule('55 23 * * *', async () => {
    logger.info('Executando fechamento diário...');
    await dailyClosing();
  });

  logger.success('✅ Jobs agendados iniciados');
}

module.exports = startAllJobs;