const scheduleIncompleteJourneysCheck = require('./checkIncompleteJourneys');
const scheduleExcessHoursCheck = require('./checkExcessHours');
const logger = require('../utils/logger');

const startAllJobs = () => {
  logger.info('🚀 Iniciando todos os jobs agendados...');
  
  scheduleIncompleteJourneysCheck();
  scheduleExcessHoursCheck();
  
  logger.success('✅ Todos os jobs foram agendados com sucesso');
};

module.exports = startAllJobs;
