const db = require('../../config/database');
const logger = require('../../utils/logger');
const auditService = require('../../services/auditService');

const CURRENT_TERMS_VERSION = '1.0.0';

class TermsController {

  // POST /api/terms/accept
  async acceptTerms(req, res, next) {
    try {
      const { signature, terms_version } = req.body;
      const userId = req.userId;

      if (!signature || !terms_version) {
        return res.status(400).json({
          error: 'Assinatura e versão do termo são obrigatórios'
        });
      }

      if (terms_version !== CURRENT_TERMS_VERSION) {
        return res.status(400).json({
          error: `Versão do termo inválida. Versão atual: ${CURRENT_TERMS_VERSION}`
        });
      }

      // Verificar se já aceitou esta versão
      const existing = await db.query(
        'SELECT id FROM terms_acceptances WHERE user_id = $1 AND terms_version = $2',
        [userId, terms_version]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          error: 'Termo já foi aceito anteriormente'
        });
      }

      const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip;
      const userAgent = req.headers['user-agent'] || '';

      // Inserir aceite
      const result = await db.query(
        `INSERT INTO terms_acceptances (user_id, terms_version, signature_data, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, accepted_at`,
        [userId, terms_version, signature, ip, userAgent]
      );

      // Atualizar flag no usuário
      await db.query(
        'UPDATE users SET terms_accepted_at = NOW() WHERE id = $1',
        [userId]
      );

      // Audit log
      try {
        await auditService.log('accept_terms', userId, 'terms_acceptances', result.rows[0].id, null, {
          terms_version,
          ip_address: ip
        }, req);
      } catch (e) {
        logger.error('Erro ao logar aceite de termos', { error: e.message });
      }

      logger.info('Termo de compromisso aceito', { userId, terms_version });

      return res.json({
        success: true,
        message: 'Termo aceito com sucesso',
        data: {
          accepted_at: result.rows[0].accepted_at,
          terms_version
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // GET /api/terms/status
  async getStatus(req, res, next) {
    try {
      const userId = req.userId;

      const result = await db.query(
        `SELECT terms_version, accepted_at FROM terms_acceptances
         WHERE user_id = $1 ORDER BY accepted_at DESC LIMIT 1`,
        [userId]
      );

      const acceptance = result.rows[0];

      return res.json({
        success: true,
        data: {
          accepted: !!acceptance && acceptance.terms_version === CURRENT_TERMS_VERSION,
          current_version: CURRENT_TERMS_VERSION,
          accepted_version: acceptance?.terms_version || null,
          accepted_at: acceptance?.accepted_at || null
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // GET /api/terms/report (admin/gestor)
  async getReport(req, res, next) {
    try {
      const result = await db.query(`
        SELECT u.id, u.matricula, u.nome, u.cargo, u.terms_accepted_at,
               ta.terms_version, ta.accepted_at, ta.ip_address
        FROM users u
        LEFT JOIN terms_acceptances ta ON u.id = ta.user_id AND ta.terms_version = $1
        WHERE u.status = 'ativo'
        ORDER BY ta.accepted_at IS NULL DESC, u.nome ASC
      `, [CURRENT_TERMS_VERSION]);

      const total = result.rows.length;
      const accepted = result.rows.filter(r => r.accepted_at).length;
      const pending = total - accepted;

      return res.json({
        success: true,
        data: {
          current_version: CURRENT_TERMS_VERSION,
          summary: { total, accepted, pending },
          users: result.rows
        }
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TermsController();
