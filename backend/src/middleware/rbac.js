const db = require('../config/database');
const logger = require('../utils/logger');

// Middleware para verificar se o usuário tem a role necessária
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userId = req.userId;

      // Busca as roles do usuário
      const result = await db.query(`
        SELECT r.nome as role_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return res.status(403).json({ 
          error: 'Usuário sem permissões definidas' 
        });
      }

      const userRoles = result.rows.map(row => row.role_name);

      // Verifica se o usuário tem alguma das roles permitidas
      const hasPermission = allowedRoles.some(role => userRoles.includes(role));

      if (!hasPermission) {
        logger.warn('Acesso negado - permissão insuficiente', {
          userId,
          userRoles,
          requiredRoles: allowedRoles
        });

        return res.status(403).json({ 
          error: 'Você não tem permissão para acessar este recurso' 
        });
      }

      req.userRoles = userRoles;
      next();

    } catch (error) {
      logger.error('Erro no middleware RBAC', { error: error.message });
      return res.status(500).json({ 
        error: 'Erro ao verificar permissões' 
      });
    }
  };
};

module.exports = checkRole;
