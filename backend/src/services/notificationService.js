const db = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('./emailService');

class NotificationService {

  async criarAlerta(userId, alertType, severity, title, message, details = {}) {
    try {
      const result = await db.query(`
        INSERT INTO alerts 
        (user_id, alert_type, severity, title, message, details, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'unread')
        RETURNING *
      `, [userId, alertType, severity, title, message, JSON.stringify(details)]);

      const alerta = result.rows[0];

      // Se for crítico, envia email imediatamente para gestores
      if (severity === 'critical' || severity === 'error') {
        const gestores = await emailService.obterEmailsGestores();
        for (const email of gestores) {
          await emailService.enviarAlertaGestor(alerta, email);
        }
      }

      logger.info('Alerta criado', { alertType, severity, userId });
      return alerta;

    } catch (error) {
      logger.error('Erro ao criar alerta', { error: error.message });
      throw error;
    }
  }

  async getAlertasNaoLidos(userId = null) {
    try {
      let query = `SELECT * FROM alerts WHERE status = 'unread'`;
      let params = [];

      if (userId) {
        query += ` AND (user_id = $1 OR user_id IS NULL)`;
        params.push(userId);
      }

      query += ` ORDER BY created_at DESC`;

      const result = await db.query(query, params);
      return result.rows;

    } catch (error) {
      logger.error('Erro ao buscar alertas não lidos', { error: error.message });
      throw error;
    }
  }

  async marcarComoLido(alertId) {
    try {
      await db.query(`
        UPDATE alerts 
        SET status = 'read' 
        WHERE id = $1
      `, [alertId]);

      logger.info('Alerta marcado como lido', { alertId });

    } catch (error) {
      logger.error('Erro ao marcar alerta como lido', { error: error.message });
      throw error;
    }
  }

  async resolverAlerta(alertId, userId, notes) {
    try {
      await db.query(`
        UPDATE alerts 
        SET status = 'resolved', resolved_by = $1, resolved_at = NOW(), resolution_notes = $2
        WHERE id = $3
      `, [userId, notes, alertId]);

      logger.info('Alerta resolvido', { alertId, userId });

    } catch (error) {
      logger.error('Erro ao resolver alerta', { error: error.message });
      throw error;
    }
  }

  async verificarJornadaIncompleta() {
    try {
      // Busca jornadas incompletas de ontem
      const result = await db.query(`
        SELECT DISTINCT u.id, u.nome, u.email, dj.date
        FROM users u
        JOIN daily_journey dj ON u.id = dj.user_id
        WHERE dj.date = CURRENT_DATE - INTERVAL '1 day'
        AND (dj.entrada IS NULL OR dj.saida_final IS NULL)
        AND u.status = 'ativo'
      `);

      for (const row of result.rows) {
        // Cria alerta
        await this.criarAlerta(
          row.id,
          'jornada_incompleta',
          'warning',
          'Jornada incompleta',
          `Jornada do dia  está incompleta`,
          { date: row.date }
        );

        // Envia email
        await emailService.enviarJornadaIncompleta(row, row.date);
      }

      logger.info(`Verificação de jornadas incompletas concluída.  alertas criados`);

    } catch (error) {
      logger.error('Erro ao verificar jornadas incompletas', { error: error.message });
    }
  }

  async verificarExcessoHoras() {
    try {
      // Busca usuários com excesso de horas na semana
      const result = await db.query(`
        SELECT 
          u.id, u.nome, u.email,
          SUM(hwd.hours_worked) as total_hours
        FROM users u
        JOIN hours_worked_daily hwd ON u.id = hwd.user_id
        WHERE hwd.date >= DATE_TRUNC('week', CURRENT_DATE)
        AND u.status = 'ativo'
        GROUP BY u.id, u.nome, u.email
        HAVING SUM(hwd.hours_worked) > 44
      `);

      for (const row of result.rows) {
        await this.criarAlerta(
          row.id,
          'excesso_horas',
          'warning',
          'Excesso de horas',
          `Total de h na semana (limite: 44h)`,
          { total_hours: row.total_hours }
        );
      }

      logger.info(`Verificação de excesso de horas concluída.  alertas criados`);

    } catch (error) {
      logger.error('Erro ao verificar excesso de horas', { error: error.message });
    }
  }
}

module.exports = new NotificationService();
