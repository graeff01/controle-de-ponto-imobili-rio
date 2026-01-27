const db = require('../config/database');
const logger = require('../utils/logger');

// Middleware para verificar se o usuário tem a role necessária
// SIMPLIFICADO: Usa o role do JWT em vez de buscar na tabela user_roles
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userRole = req.userRole; // Vem do JWT via authMiddleware

      if (!userRole) {
        return res.status(403).json({
          error: 'Usuário sem permissões definidas'
        });
      }

      // Mapear roles para compatibilidade
      // JWT pode ter 'manager' ou 'admin', mas routes esperam 'gestor' ou 'admin'
      const roleMapping = {
        'manager': 'gestor',
        'admin': 'admin',
        'employee': 'employee'
      };

      const mappedRole = roleMapping[userRole] || userRole;

      // Verifica se o usuário tem alguma das roles permitidas
      const hasPermission = allowedRoles.includes(mappedRole);

      if (!hasPermission) {
        logger.warn('Acesso negado - permissão insuficiente', {
          userId: req.userId,
          userRole: mappedRole,
          requiredRoles: allowedRoles
        });

        return res.status(403).json({
          error: 'Você não tem permissão para acessar este recurso'
        });
      }

      req.userRoles = [mappedRole];
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
