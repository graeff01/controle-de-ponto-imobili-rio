const authService = require('./auth.service');
const logger = require('../../utils/logger');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../../config/database');
const { validatePassword } = require('../../utils/validationSchemas');

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

      // Validar força da senha
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          error: 'Senha não atende aos requisitos de segurança',
          details: passwordValidation.errors
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
               u.status, u.role, u.data_admissao, u.created_at
        FROM users u
        WHERE u.id = $1
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

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email é obrigatório'
        });
      }

      // Buscar usuário
      const result = await db.query(
        'SELECT id, nome, email FROM users WHERE email = $1 AND status = $2',
        [email, 'ativo']
      );

      if (result.rows.length === 0) {
        // Por segurança, sempre retorna sucesso mesmo se email não existir
        return res.json({
          success: true,
          message: 'Se o email existir, você receberá instruções para redefinir sua senha'
        });
      }

      const user = result.rows[0];

      // Gerar token de recuperação (válido por 1 hora)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

      // Salvar token no banco
      await db.query(`
        UPDATE users 
        SET reset_password_token = $1, reset_password_expires = $2
        WHERE id = $3
      `, [resetTokenHash, resetTokenExpiry, user.id]);

      // Link de recuperação
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      // Enviar email
      const emailService = require('../../services/emailService');
      await emailService.enviarEmailRecuperacao(user, resetUrl);

      logger.info('Token de recuperação gerado e enviado por e-mail', {
        user_id: user.id
      });

      res.json({
        success: true,
        message: 'Instruções para redefinir sua senha foram enviadas para o seu e-mail.',
        // Retornamos o link apenas em desenvolvimento para facilitar testes
        resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
      });

    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token e nova senha são obrigatórios'
        });
      }

      // Validar força da senha
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Senha não atende aos requisitos de segurança',
          details: passwordValidation.errors
        });
      }

      // Hash do token para comparar
      const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Buscar usuário com token válido
      const result = await db.query(`
        SELECT id, nome, email 
        FROM users 
        WHERE reset_password_token = $1 
        AND reset_password_expires > NOW()
        AND status = 'ativo'
      `, [resetTokenHash]);

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Token inválido ou expirado'
        });
      }

      const user = result.rows[0];

      // Hash da nova senha
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Atualizar senha e limpar token
      await db.query(`
        UPDATE users 
        SET password_hash = $1,
            reset_password_token = NULL,
            reset_password_expires = NULL,
            updated_at = NOW()
        WHERE id = $2
      `, [passwordHash, user.id]);

      logger.info('Senha redefinida com sucesso', { user_id: user.id });

      res.json({
        success: true,
        message: 'Senha redefinida com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();