const authService = require('./auth.service');
const logger = require('../../utils/logger');

class AuthController {

  async login(req, res, next) {
    try {
      const { matricula, password } = req.body;

      if (!matricula || !password) {
        return res.status(400).json({
          error: 'Matrícula e senha são obrigatórios'
        });
      }

      const result = await authService.login(matricula, password, req);

      return res.json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Refresh token é obrigatório'
        });
      }

      const result = await authService.refreshToken(refreshToken);

      return res.json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  async validateToken(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'Token é obrigatório'
        });
      }

      const result = await authService.validateToken(token);

      return res.json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.userId;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Senha atual e nova senha são obrigatórias'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error: 'Nova senha deve ter no mínimo 6 caracteres'
        });
      }

      const result = await authService.changePassword(userId, currentPassword, newPassword);

      return res.json({
        success: true,
        message: 'Senha alterada com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
    try {
      const userId = req.userId;

      const result = await db.query(`
        SELECT u.id, u.matricula, u.cpf, u.nome, u.email, u.cargo, u.departamento, 
               u.status, u.data_admissao, u.created_at,
               ARRAY_AGG(r.nome) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = $1
        GROUP BY u.id
      `, [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Usuário não encontrado'
        });
      }

      return res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
