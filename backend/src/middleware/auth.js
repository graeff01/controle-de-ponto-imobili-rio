const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const logger = require('../utils/logger');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Token não fornecido' 
      });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      return res.status(401).json({ 
        error: 'Token mal formatado' 
      });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({ 
        error: 'Token mal formatado' 
      });
    }

    jwt.verify(token, jwtConfig.secret, (err, decoded) => {
      if (err) {
        logger.warn('Token inválido', { error: err.message });
        return res.status(401).json({ 
          error: 'Token inválido ou expirado' 
        });
      }

      req.userId = decoded.id;
      req.userRole = decoded.role;
      
      return next();
    });

  } catch (error) {
    logger.error('Erro no middleware de autenticação', { error: error.message });
    return res.status(500).json({ 
      error: 'Erro interno no servidor' 
    });
  }
};

module.exports = authMiddleware;
