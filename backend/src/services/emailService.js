const resend = require('../config/email');
const db = require('../config/database');
const logger = require('../utils/logger');
const dateHelper = require('../utils/dateHelper');

class EmailService {

  async enviarEmail(to, subject, html, emailType, userId = null, relatedId = null) {
    try {
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
            <p>Olá <strong></strong>,</p>
            
            <p>Identificamos que sua jornada do dia <strong></strong> está incompleta.</p>
            
            <p>Por favor, entre em contato com seu gestor para regularizar a situação.</p>
            
            <p><a href="" class="button">Acessar Sistema</a></p>
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
      `⚠️ Jornada incompleta - `,
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
            border-left: 5px solid ; 
            background: #f7fafc; 
            margin: 20px 0;
          }
          .alert-title { color: ; margin: 0 0 10px 0; }
        </style>
      </head>
      <body>
        <div class="alert-box">
          <h2 class="alert-title"></h2>
          <p></p>
          <p><strong>Horário:</strong> </p>
          <p><a href="/alerts/">Ver detalhes no sistema</a></p>
        </div>
      </body>
      </html>
    `;

    return await this.enviarEmail(
      gestorEmail,
      `🚨 `,
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
          <p>Olá <strong></strong>,</p>
          <p>Seu ponto foi registrado com sucesso:</p>
          <ul>
            <li><strong>Tipo:</strong> </li>
            <li><strong>Horário:</strong> </li>
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
