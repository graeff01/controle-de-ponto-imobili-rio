const resend = require('../config/email');
const db = require('../config/database');
const logger = require('../utils/logger');
const dateHelper = require('../utils/dateHelper');

class EmailService {

  async enviarEmail(to, subject, html, emailType, userId = null, relatedId = null) {
    try {
      // Verificar se email está habilitado
      if (!resend) {
        logger.warn('📧 Email não enviado (Resend não configurado)', {
          to,
          subject
        });

        // Registra log mesmo sem enviar
        try {
          await db.query(`
            INSERT INTO email_logs 
            (recipient_email, subject, email_type, status, error_message, user_id, related_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `, [to, subject, emailType, 'skipped', 'Resend não configurado', userId, relatedId]);
        } catch (err) {
          // Ignora erro de log
        }

        return { success: false, message: 'Email desabilitado' };
      }

      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Sistema de Ponto <ponto@imobiliaria.com>',
        to: to,
        subject: subject,
        html: html
      });

      // Registra log de email
      await db.query(`
        INSERT INTO email_logs 
        (recipient_email, subject, email_type, status, sent_at, user_id, related_id)
        VALUES ($1, $2, $3, $4, NOW(), $5, $6)
      `, [to, subject, emailType, error ? 'failed' : 'sent', userId, relatedId]);

      if (error) {
        logger.error('Erro ao enviar email', { error, to, subject });
        return { success: false, error };
      }

      logger.success('Email enviado com sucesso', { to, subject });
      return { success: true, data };

    } catch (error) {
      logger.error('Erro ao enviar email', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async enviarJornadaIncompleta(usuario, data) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e53e3e; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { padding: 30px; background: #f7fafc; border: 1px solid #e2e8f0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #718096; }
          .button { display: inline-block; padding: 12px 24px; background: #3182ce; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Jornada Incompleta</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${usuario.nome}</strong>,</p>
            
            <p>Identificamos que sua jornada do dia <strong>${dateHelper.formatDateBR(data)}</strong> está incompleta.</p>
            
            <p>Por favor, entre em contato com seu gestor para regularizar a situação.</p>
            
            <p><a href="${process.env.FRONTEND_URL}" class="button">Acessar Sistema</a></p>
          </div>
          <div class="footer">
            <p>Sistema de Ponto - Imobiliária</p>
            <p>Este é um email automático. Não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.enviarEmail(
      usuario.email,
      `⚠️ Jornada incompleta - ${dateHelper.formatDateBR(data)}`,
      html,
      'jornada_incompleta',
      usuario.id
    );
  }

  async enviarAlertaGestor(alerta, gestorEmail) {
    const severityColors = {
      info: '#3182ce',
      warning: '#f59e0b',
      error: '#e53e3e',
      critical: '#991b1b'
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .alert-box { 
            padding: 20px; 
            border-left: 5px solid ${severityColors[alerta.severity]}; 
            background: #f7fafc; 
            margin: 20px 0;
          }
          .alert-title { color: ${severityColors[alerta.severity]}; margin: 0 0 10px 0; }
        </style>
      </head>
      <body>
        <div class="alert-box">
          <h2 class="alert-title">${alerta.title}</h2>
          <p>${alerta.message}</p>
          <p><strong>Horário:</strong> ${dateHelper.formatDateTimeBR(alerta.created_at)}</p>
          <p><a href="${process.env.FRONTEND_URL}/alerts/${alerta.id}">Ver detalhes no sistema</a></p>
        </div>
      </body>
      </html>
    `;

    return await this.enviarEmail(
      gestorEmail,
      `🚨 ${alerta.title}`,
      html,
      'alert',
      alerta.user_id,
      alerta.id
    );
  }

  async enviarPontoRegistrado(usuario, registro) {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #48bb78;">✅ Ponto Registrado</h2>
          <p>Olá <strong>${usuario.nome}</strong>,</p>
          <p>Seu ponto foi registrado com sucesso:</p>
          <ul>
            <li><strong>Tipo:</strong> ${registro.record_type}</li>
            <li><strong>Horário:</strong> ${dateHelper.formatDateTimeBR(registro.timestamp)}</li>
          </ul>
        </div>
      </body>
      </html>
    `;

    return await this.enviarEmail(
      usuario.email,
      '✅ Ponto registrado com sucesso',
      html,
      'ponto_registrado',
      usuario.id,
      registro.id
    );
  }

  async enviarEmailRecuperacao(usuario, resetUrl) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a202c; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background: #1a202c; color: white; padding: 32px; text-align: center; }
          .content { padding: 40px; }
          .footer { padding: 24px; text-align: center; font-size: 13px; color: #718096; background: #f7fafc; }
          .button { display: inline-block; padding: 16px 32px; background: #3182ce; color: white !important; text-decoration: none; border-radius: 12px; font-weight: bold; margin-top: 24px; }
          .warning { font-size: 12px; color: #a0aec0; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h2 style="margin:0">Recuperação de Senha</h2>
            </div>
            <div class="content">
              <p>Olá, <strong>${usuario.nome}</strong>,</p>
              <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Sistema de Ponto Jardim do Lago</strong>.</p>
              <p>Clique no botão abaixo para escolher uma nova senha. Este link expira em 1 hora.</p>
              
              <div style="text-align: center">
                <a href="${resetUrl}" class="button">Redefinir minha senha</a>
              </div>

              <p class="warning">Se você não solicitou isso, pode ignorar este e-mail com segurança. Sua senha não será alterada.</p>
            </div>
            <div class="footer">
              <p>Jardim do Lago Imobiliária - Gestão de Ponto</p>
              <p>Este é um e-mail automático, por favor não responda.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.enviarEmail(
      usuario.email,
      '🔑 Recuperação de senha - Sistema de Ponto',
      html,
      'password_reset',
      usuario.id
    );
  }

  async obterEmailsGestores() {
    try {
      const result = await db.query(`
        SELECT DISTINCT u.email 
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE r.nome IN ('gestor', 'admin') AND u.status = 'ativo'
      `);

      return result.rows.map(row => row.email);
    } catch (error) {
      logger.error('Erro ao buscar emails de gestores', { error: error.message });
      return [];
    }
  }
}

module.exports = new EmailService();