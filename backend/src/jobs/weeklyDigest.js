const db = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

async function runWeeklyDigest() {
    logger.info('📊 Iniciando Digest Semanal (Relatório Executivo)');

    try {
        // 📊 1. Buscar Totais da Semana
        const statsWeek = await db.query(`
      SELECT 
        SUM(hours_worked) as total_worked,
        SUM(hours_expected) as total_expected,
        SUM(CASE WHEN hours_worked > hours_expected THEN (hours_worked - hours_expected) ELSE 0 END) as total_extra,
        SUM(CASE WHEN hours_worked < hours_expected AND hours_worked > 0 THEN (hours_expected - hours_worked) ELSE 0 END) as total_missing
      FROM hours_bank
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    `);

        // 🏥 2. Buscar Absenteísmo (Faltas injustificadas)
        const absences = await db.query(`
      SELECT COUNT(*) as count 
      FROM hours_bank 
      WHERE hours_worked = 0 AND date >= CURRENT_DATE - INTERVAL '7 days'
    `);

        // 🚨 3. Alertas Pendentes
        const unreadAlerts = await db.query(`
      SELECT COUNT(*) FROM alerts WHERE status = 'unread'
    `);

        // 🏆 4. Top Horas Extras (Ranking)
        const rankingExtra = await db.query(`
      SELECT u.nome, SUM(hours_worked - hours_expected) as total_extra
      FROM hours_bank hb
      JOIN users u ON hb.user_id = u.id
      WHERE hb.date >= CURRENT_DATE - INTERVAL '7 days'
      AND hours_worked > hours_expected
      GROUP BY u.nome
      ORDER BY total_extra DESC
      LIMIT 3
    `);

        // 📧 5. Montar HTML do e-mail
        const summary = statsWeek.rows[0];
        const gestores = await emailService.obterEmailsGestores();

        const html = `
      <div style="font-family: sans-serif; color: #1a202c; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #0f172a; color: white; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Relatório Semanal JDL</h1>
          <p style="opacity: 0.8; margin-top: 8px;">Semana de ${new Date(Date.now() - 604800000).toLocaleDateString('pt-BR')} a ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>
        
        <div style="padding: 32px;">
          <div style="display: grid; gap: 16px; margin-bottom: 32px;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 12px;">
              <p style="margin: 0; font-size: 14px; color: #64748b; font-weight: bold; text-transform: uppercase;">Horas Extras Totais</p>
              <h2 style="margin: 8px 0 0; color: #10b981; font-size: 32px;">+${parseFloat(summary.total_extra || 0).toFixed(1)}h</h2>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">🚨 Alertas Pendentes</td>
              <td style="text-align: right; font-weight: bold;">${unreadAlerts.rows[0].count}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">🚫 Faltas na Semana</td>
              <td style="text-align: right; font-weight: bold; color: #ef4444;">${absences.rows[0].count}</td>
            </tr>
          </table>

          <h3 style="font-size: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 16px;">Top Horas Extras</h3>
          ${rankingExtra.rows.map(r => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
              <span>${r.nome}</span>
              <span style="font-weight: bold; color: #10b981;">+${parseFloat(r.total_extra).toFixed(1)}h</span>
            </div>
          `).join('')}

          <div style="margin-top: 40px; text-align: center;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #0f172a; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">Ver Dashboard Completo</a>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
          Jardim do Lago Imobiliária - Controle de Ponto Automatizado
        </div>
      </div>
    `;

        for (const email of gestores) {
            await emailService.enviarEmail(
                email,
                '📊 Relatório Semanal de Presença - JDL',
                html,
                'weekly_digest'
            );
        }

        // Logar execução
        await db.query(`
      INSERT INTO system_jobs_log (job_name, status, details) 
      VALUES ('weekly_digest', 'success', $1)
    `, [JSON.stringify(summary)]);

        logger.success('✅ Digest Semanal enviado para gestores');

    } catch (error) {
        logger.error('❌ Erro no Digest Semanal', { error: error.message });
        await db.query(`
      INSERT INTO system_jobs_log (job_name, status, details) 
      VALUES ('weekly_digest', 'error', $1)
    `, [JSON.stringify({ error: error.message })]);
    }
}

module.exports = runWeeklyDigest;
