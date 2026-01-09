const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');
const jwtConfig = require('../../config/jwt');
const logger = require('../../utils/logger');
const auditService = require('../../services/auditService');

class AuthService {

  async login(matricula, password, req) {
    try {
      // Busca usuário por matrícula
      const result = await db.query(`
        SELECT u.*, 
               ARRAY_AGG(r.nome) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.matricula = $1
        GROUP BY u.id
      `, [matricula]);

      if (result.rows.length === 0) {
        logger.warn('Tentativa de login com matrícula inexistente', { matricula });
        throw new Error('Matrícula ou senha inválidos');
      }

      const user = result.rows[0];

      // Verifica se usuário está ativo
      if (user.status !== 'ativo') {
        logger.warn('Tentativa de login com usuário inativo', { matricula, status: user.status });
        throw new Error('Usuário inativo. Entre em contato com o administrador.');
      }

      // Verifica senha
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        logger.warn('Tentativa de login com senha incorreta', { matricula });
        throw new Error('Matrícula ou senha inválidos');
      }

      // Gera tokens
      const token = jwt.sign(
        { 
          id: user.id, 
          matricula: user.matricula,
          roles: user.roles 
        },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        jwtConfig.refreshSecret,
        { expiresIn: jwtConfig.refreshExpiresIn }
      );

      // Log de auditoria
      await auditService.log(
        'user_login',
        user.id,
        null,
        `Usuário  fez login`,
        { matricula: user.matricula },
        req
      );

      logger.success('Login realizado com sucesso', { userId: user.id, matricula });

      // Remove dados sensíveis
      delete user.password_hash;

      return {
        user,
        token,
        refreshToken
      };

    } catch (error) {
      logger.error('Erro no login', { error: error.message });
      throw error;
    }
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);

      // Busca usuário
      const result = await db.query(`
        SELECT u.*, 
               ARRAY_AGG(r.nome) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = $1
        GROUP BY u.id
      `, [decoded.id]);

      if (result.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }

      const user = result.rows[0];

      if (user.status !== 'ativo') {
        throw new Error('Usuário inativo');
      }

      // Gera novo token
      const newToken = jwt.sign(
        { 
          id: user.id, 
          matricula: user.matricula,
          roles: user.roles 
        },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
      );

      logger.info('Token renovado', { userId: user.id });

      return { token: newToken };

    } catch (error) {
      logger.error('Erro ao renovar token', { error: error.message });
      throw new Error('Token inválido ou expirado');
    }
  }

  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, jwtConfig.secret);
      return { valid: true, decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Busca usuário
      const result = await db.query(`
        SELECT * FROM users WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }

      const user = result.rows[0];

      // Verifica senha atual
      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!passwordMatch) {
        throw new Error('Senha atual incorreta');
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 10);

      // Atualiza senha
      await db.query(`
        UPDATE users 
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
      `, [hashedPassword, userId]);

      // Log de auditoria
      await auditService.log(
        'password_changed',
        userId,
        null,
        'Senha alterada pelo usuário',
        {}
      );

      logger.success('Senha alterada com sucesso', { userId });

      return { success: true };

    } catch (error) {
      logger.error('Erro ao alterar senha', { error: error.message });
      throw error;
    }
  }
}

module.exports = new AuthService();
