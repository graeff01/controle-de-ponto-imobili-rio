const db = require('../../config/database');
const logger = require('../../utils/logger');
const auditService = require('../../services/auditService');
const { generateAndStorePdf } = require('../../services/termsPdfService');

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

      // Gerar PDF assíncrono
      try {
        const userData = await db.query('SELECT id, nome, matricula, cargo FROM users WHERE id = $1', [userId]);
        if (userData.rows[0]) {
          generateAndStorePdf(
            result.rows[0].id,
            userData.rows[0],
            signature,
            ip,
            userAgent,
            result.rows[0].accepted_at
          ).catch(e => logger.error('Falha ao gerar PDF do termo', { error: e.message }));
        }
      } catch (e) {
        logger.error('Erro ao buscar dados para PDF', { error: e.message });
      }

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
               ta.terms_version, ta.accepted_at, ta.ip_address, ta.integrity_hash
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

  // GET /api/terms/export (admin/gestor) - Exportar relatório Excel
  async exportReport(req, res, next) {
    try {
      const XLSX = require('xlsx');

      const result = await db.query(`
        SELECT u.matricula, u.nome, u.cargo,
               ta.terms_version, ta.accepted_at, ta.ip_address, ta.integrity_hash
        FROM users u
        LEFT JOIN terms_acceptances ta ON u.id = ta.user_id AND ta.terms_version = $1
        WHERE u.status = 'ativo'
        ORDER BY ta.accepted_at IS NULL DESC, u.nome ASC
      `, [CURRENT_TERMS_VERSION]);

      const rows = result.rows.map(r => ({
        'Matrícula': r.matricula,
        'Nome': r.nome,
        'Cargo': r.cargo || '',
        'Status': r.accepted_at ? 'Assinado' : 'Pendente',
        'Versão Termo': r.terms_version || '',
        'Data Aceite': r.accepted_at ? new Date(r.accepted_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '',
        'IP': r.ip_address || '',
        'Hash Integridade': r.integrity_hash || ''
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      // Ajustar largura das colunas
      ws['!cols'] = [
        { wch: 12 }, // Matrícula
        { wch: 35 }, // Nome
        { wch: 20 }, // Cargo
        { wch: 12 }, // Status
        { wch: 12 }, // Versão
        { wch: 22 }, // Data
        { wch: 18 }, // IP
        { wch: 66 }, // Hash
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Termos de Compromisso');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const dataAtual = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Relatorio_Termos_${dataAtual}.xlsx"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);

    } catch (error) {
      next(error);
    }
  }

  // GET /api/terms/pdf/:userId (admin/gestor) - Download PDF do termo assinado
  async downloadPdf(req, res, next) {
    try {
      const { userId } = req.params;
      const zlib = require('zlib');

      const result = await db.query(
        `SELECT ta.pdf_data, ta.terms_version, ta.accepted_at, u.nome, u.matricula
         FROM terms_acceptances ta
         JOIN users u ON ta.user_id = u.id
         WHERE ta.user_id = $1 AND ta.pdf_data IS NOT NULL
         ORDER BY ta.accepted_at DESC LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'PDF do termo não encontrado para este funcionário' });
      }

      const row = result.rows[0];
      const pdfBuffer = zlib.gunzipSync(row.pdf_data);

      const filename = `Termo_${row.matricula}_${row.nome.replace(/\s+/g, '_')}_v${row.terms_version}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);

    } catch (error) {
      next(error);
    }
  }

  // GET /api/terms/signature/:userId (admin/gestor) - Ver assinatura e metadados
  async getSignature(req, res, next) {
    try {
      const { userId } = req.params;

      const result = await db.query(
        `SELECT ta.signature_data, ta.terms_version, ta.accepted_at, ta.ip_address, ta.user_agent, ta.integrity_hash,
                u.nome, u.matricula, u.cargo
         FROM terms_acceptances ta
         JOIN users u ON ta.user_id = u.id
         WHERE ta.user_id = $1
         ORDER BY ta.accepted_at DESC LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Aceite de termo não encontrado para este funcionário' });
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

module.exports = new TermsController();
