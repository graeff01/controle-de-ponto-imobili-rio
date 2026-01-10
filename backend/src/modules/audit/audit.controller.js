const db = require('../../config/database');

class AuditController {

  async getLogs(req, res, next) {
    try {
      const { limit = 50, table_name, user_id } = req.query;

      let query = `
        SELECT 
          al.*,
          u.nome as user_name,
          u.matricula as user_matricula
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;

      const params = [];

      if (table_name) {
        params.push(table_name);
        query += ` AND al.table_name = $${params.length}`;
      }

      if (user_id) {
        params.push(user_id);
        query += ` AND al.user_id = $${params.length}`;
      }

      params.push(limit);
      query += ` ORDER BY al.created_at DESC LIMIT $${params.length}`;

      const result = await db.query(query, params);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      next(error);
    }
  }

  async getRecordHistory(req, res, next) {
    try {
      const { table_name, record_id } = req.params;

      const result = await db.query(`
        SELECT 
          al.*,
          u.nome as user_name,
          u.matricula as user_matricula
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.table_name = $1 AND al.record_id = $2
        ORDER BY al.created_at DESC
      `, [table_name, record_id]);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuditController();