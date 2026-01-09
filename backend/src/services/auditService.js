const db = require('../config/database');
const logger = require('../utils/logger');

class AuditService {
  
  async log(eventType, userId, targetUserId, description, details = {}, req = null) {
    try {
      const ip_address = req ? req.ip : null;
      const user_agent = req ? req.get('user-agent') : null;

      await db.query(`
        INSERT INTO audit_logs 
        (event_type, user_id, target_user_id, description, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [eventType, userId, targetUserId, description, JSON.stringify(details), ip_address, user_agent]);

      logger.info('Log de auditoria criado', { eventType, userId, targetUserId });

    } catch (error) {
      logger.error('Erro ao criar log de auditoria', { error: error.message });
    }
  }

  async getUserLogs(userId, limit = 50) {
    try {
      const result = await db.query(`
        SELECT * FROM audit_logs
        WHERE user_id = $1 OR target_user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar logs do usuário', { error: error.message });
      throw error;
    }
  }

  async getSystemLogs(eventType = null, limit = 100) {
    try {
      let query = 'SELECT * FROM audit_logs';
      let params = [];

      if (eventType) {
        query += ' WHERE event_type = $1';
        params.push(eventType);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
      params.push(limit);

      const result = await db.query(query, params);
      return result.rows;

    } catch (error) {
      logger.error('Erro ao buscar logs do sistema', { error: error.message });
      throw error;
    }
  }
}

module.exports = new AuditService();
