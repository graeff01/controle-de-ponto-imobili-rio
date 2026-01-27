const db = require('../../config/database');
const logger = require('../../utils/logger');

class AlertsService {

  async createAlert(data) {
    try {
      const { user_id, alert_type, title, message, severity, related_id } = data;

      // Verifica se a tabela tem as colunas title e severity
      // Se não tiver, usa apenas as colunas básicas (compatibilidade)
      let result;
      try {
        result = await db.query(`
          INSERT INTO alerts
          (user_id, alert_type, title, message, severity, related_id, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'unread', NOW())
          RETURNING *
        `, [user_id, alert_type, title, message, severity || 'info', related_id]);
      } catch (colError) {
        // Se falhar (colunas não existem), usa versão simplificada
        if (colError.message.includes('does not exist')) {
          logger.warn('Usando versão simplificada de alerts (sem title/severity)');
          // Combina title e message em uma única mensagem
          const fullMessage = title ? `${title}: ${message}` : message;
          result = await db.query(`
            INSERT INTO alerts
            (user_id, alert_type, message, status, created_at)
            VALUES ($1, $2, $3, 'unread', NOW())
            RETURNING *
          `, [user_id, alert_type, fullMessage]);
        } else {
          throw colError;
        }
      }

      logger.info('Novo alerta criado', { alertId: result.rows[0].id, type: alert_type });

      // Se for crítico, poderíamos disparar e-mail aqui também
      if (severity === 'critical' || severity === 'error') {
        try {
          const emailService = require('../../services/emailService');
          const gestores = await emailService.obterEmailsGestores();
          if (gestores.length > 0) {
            await emailService.enviarAlertaGestor(result.rows[0], gestores[0]);
          }
        } catch (emailError) {
          logger.error('Erro ao enviar email de alerta', { error: emailError.message });
          // Não falha a criação do alerta se o email falhar
        }
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao criar alerta', { error: error.message });
      throw error;
    }
  }

  async getAlerts(filters = {}) {
    try {
      let query = `
        SELECT a.*, u.nome as user_name, u.matricula
        FROM alerts a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      if (filters.userId) {
        query += ` AND a.user_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }

      if (filters.status) {
        query += ` AND a.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.severity) {
        query += ` AND a.severity = $${paramIndex}`;
        params.push(filters.severity);
        paramIndex++;
      }

      if (filters.alertType) {
        query += ` AND a.alert_type = $${paramIndex}`;
        params.push(filters.alertType);
        paramIndex++;
      }

      query += ` ORDER BY a.created_at DESC LIMIT 100`;

      const result = await db.query(query, params);
      return result.rows;

    } catch (error) {
      logger.error('Erro ao buscar alertas', { error: error.message });
      throw error;
    }
  }

  async getAlertById(alertId) {
    try {
      const result = await db.query(`
        SELECT a.*, 
               u.nome as user_name, u.matricula, u.email,
               r.nome as resolved_by_name
        FROM alerts a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN users r ON a.resolved_by = r.id
        WHERE a.id = $1
      `, [alertId]);

      if (result.rows.length === 0) {
        throw new Error('Alerta não encontrado');
      }

      return result.rows[0];

    } catch (error) {
      logger.error('Erro ao buscar alerta', { error: error.message });
      throw error;
    }
  }

  async markAsRead(alertId) {
    try {
      await db.query(`
        UPDATE alerts SET status = 'read' WHERE id = $1
      `, [alertId]);

      logger.info('Alerta marcado como lido', { alertId });

    } catch (error) {
      logger.error('Erro ao marcar alerta como lido', { error: error.message });
      throw error;
    }
  }

  async resolveAlert(alertId, userId, notes) {
    try {
      await db.query(`
        UPDATE alerts 
        SET status = 'resolved', 
            resolved_by = $1, 
            resolved_at = NOW(), 
            resolution_notes = $2
        WHERE id = $3
      `, [userId, notes, alertId]);

      logger.success('Alerta resolvido', { alertId, userId });

    } catch (error) {
      logger.error('Erro ao resolver alerta', { error: error.message });
      throw error;
    }
  }

  async dismissAlert(alertId) {
    try {
      await db.query(`
        UPDATE alerts SET status = 'dismissed' WHERE id = $1
      `, [alertId]);

      logger.info('Alerta descartado', { alertId });

    } catch (error) {
      logger.error('Erro ao descartar alerta', { error: error.message });
      throw error;
    }
  }

  async getStatistics() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'unread') as unread,
          COUNT(*) FILTER (WHERE status = 'read') as read,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical,
          COUNT(*) FILTER (WHERE severity = 'error') as errors,
          COUNT(*) FILTER (WHERE severity = 'warning') as warnings,
          COUNT(*) as total
        FROM alerts
        WHERE created_at > NOW() - INTERVAL '30 days'
      `);

      return result.rows[0];

    } catch (error) {
      logger.error('Erro ao buscar estatísticas de alertas', { error: error.message });
      throw error;
    }
  }
}

module.exports = new AlertsService();
