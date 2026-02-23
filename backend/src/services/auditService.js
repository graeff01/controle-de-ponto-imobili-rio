const db = require('../config/database');
const logger = require('../utils/logger');

class AuditService {

  /**
   * Registra ação no log de auditoria
   * Compatível com a estrutura real da tabela audit_logs:
   * (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
   */
  async log(action, userId, tableName, recordId = null, oldValues = null, newValues = null, req = null) {
    try {
      const ip_address = req ? req.ip : null;
      const user_agent = req ? req.get('user-agent') : null;

      await db.query(`
        INSERT INTO audit_logs
        (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        userId,
        action,
        tableName,
        recordId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ip_address,
        user_agent
      ]);

    } catch (error) {
      // Nunca bloqueia a operação principal
      logger.error('Erro ao criar log de auditoria', { error: error.message, action });
    }
  }

  async getUserLogs(userId, limit = 50) {
    try {
      const result = await db.query(`
        SELECT al.*, u.nome as user_nome
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.user_id = $1
        ORDER BY al.created_at DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar logs do usuário', { error: error.message });
      return [];
    }
  }

  async getSystemLogs(filters = {}, limit = 100) {
    try {
      let query = `
        SELECT al.*, u.nome as user_nome
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;
      let params = [];
      let paramCount = 1;

      if (filters.action) {
        query += ` AND al.action = $${paramCount}`;
        params.push(filters.action);
        paramCount++;
      }

      if (filters.tableName) {
        query += ` AND al.table_name = $${paramCount}`;
        params.push(filters.tableName);
        paramCount++;
      }

      if (filters.userId) {
        query += ` AND al.user_id = $${paramCount}`;
        params.push(filters.userId);
        paramCount++;
      }

      query += ` ORDER BY al.created_at DESC LIMIT $${paramCount}`;
      params.push(limit);

      const result = await db.query(query, params);
      return result.rows;

    } catch (error) {
      logger.error('Erro ao buscar logs do sistema', { error: error.message });
      return [];
    }
  }
}

module.exports = new AuditService();
