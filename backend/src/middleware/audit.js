const db = require('../config/database');
const logger = require('../utils/logger');

const auditMiddleware = (action, tableName) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = async function(data) {
      try {
        // Só registra ações de modificação (não GET)
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          await db.query(`
            INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            req.user?.id || null,
            action || req.method,
            tableName,
            data?.data?.id || null,
            JSON.stringify(data?.data || {}),
            req.ip,
            req.get('user-agent')
          ]);
        }
      } catch (error) {
        logger.error('Erro ao registrar auditoria', { error: error.message });
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

module.exports = auditMiddleware;