const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');
const jwtConfig = require('../../config/jwt');
const logger = require('../../utils/logger');

class AuthService {

  async login(matricula, password) {
    try {
      // Buscar usuário
      const result = await db.query(
        'SELECT * FROM users WHERE matricula = $1 AND status = $2',
        [matricula, 'ativo']
      );

      if (result.rows.length === 0) {
        logger.warn('Tentativa de login inválida', { matricula });
        throw new Error('Credenciais inválidas');
      }

      const user = result.rows[0];

      // Verificar senha
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        logger.warn('Senha incorreta', { matricula });
        throw new Error('Credenciais inválidas');
      }

      // Usar a role do banco de dados (que já está correta: admin, manager, employee)
      const role = user.role || 'employee';

      // Gerar token JWT
      const token = jwt.sign(
        {
          id: user.id,
          matricula: user.matricula,
          nome: user.nome,
          role: role
        },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
      );

      // Atualizar último login
      await db.query(
        'UPDATE users SET updated_at = NOW() WHERE id = $1',
        [user.id]
      );

      logger.success('Login realizado', {
        user_id: user.id,
        matricula: user.matricula,
        role: role
      });

      return {
        token,
        user: {
          id: user.id,
          matricula: user.matricula,
          nome: user.nome,
          email: user.email,
          cargo: user.cargo,
          role: role
        }
      };

    } catch (error) {
      logger.error('Erro no login', { error: error.message });
      throw error;
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
}

module.exports = new AuthService();