const db = require('../config/database');
const logger = require('../utils/logger');

async function checkLateArrivals() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    // Buscar usuários que deveriam ter entrado mas não entraram
    const lateUsers = await db.query(`
      SELECT 
        u.id,
        u.nome,
        u.matricula,
        u.work_hours_start,
        u.work_hours_end
      FROM users u
      WHERE u.status = 'ativo'
      AND u.work_hours_start < $1
      AND NOT EXISTS (
        SELECT 1 FROM time_records tr
        WHERE tr.user_id = u.id
        AND DATE(tr.timestamp) = $2
        AND tr.record_type = 'entrada'
      )
    `, [currentTime, today]);

    if (lateUsers.rows.length > 0) {
      logger.warn(`⚠️ ${lateUsers.rows.length} funcionário(s) atrasado(s)`, {
        usuarios: lateUsers.rows.map(u => u.nome)
      });

      // Criar alertas
      for (const user of lateUsers.rows) {
        await db.query(`
          INSERT INTO alerts (user_id, alert_type, message, status)
          VALUES ($1, 'late', $2, 'unread')
          ON CONFLICT DO NOTHING
        `, [
          user.id,
          `${user.nome} não registrou entrada (esperado às ${user.work_hours_start})`
        ]);
      }
    }

  } catch (error) {
    logger.error('Erro ao verificar atrasos', { error: error.message });
  }
}

async function checkMissingExits() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    // Buscar usuários que entraram mas não saíram
    const missingExits = await db.query(`
      SELECT 
        u.id,
        u.nome,
        u.matricula,
        u.work_hours_end,
        tr.timestamp as entrada
      FROM users u
      JOIN time_records tr ON tr.user_id = u.id
      WHERE u.status = 'ativo'
      AND DATE(tr.timestamp) = $1
      AND tr.record_type = 'entrada'
      AND u.work_hours_end < $2
      AND NOT EXISTS (
        SELECT 1 FROM time_records tr2
        WHERE tr2.user_id = u.id
        AND DATE(tr2.timestamp) = $1
        AND tr2.record_type = 'saida_final'
      )
    `, [today, currentTime]);

    if (missingExits.rows.length > 0) {
      logger.warn(`⚠️ ${missingExits.rows.length} funcionário(s) sem saída`, {
        usuarios: missingExits.rows.map(u => u.nome)
      });

      // Criar alertas
      for (const user of missingExits.rows) {
        await db.query(`
          INSERT INTO alerts (user_id, alert_type, message, status)
          VALUES ($1, 'missing_exit', $2, 'unread')
          ON CONFLICT DO NOTHING
        `, [
          user.id,
          `${user.nome} não registrou saída (esperado até ${user.work_hours_end})`
        ]);
      }
    }

  } catch (error) {
    logger.error('Erro ao verificar saídas', { error: error.message });
  }
}

module.exports = {
  checkLateArrivals,
  checkMissingExits
};