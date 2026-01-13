const db = require('../../config/database');
const logger = require('../../utils/logger');
const crypto = require('crypto');
const reportsService = require('../reports/reports.service');

class TimeMirrorsService {

    // Gera (ou busca) o espelho para assinatura
    async generate(userId, year, month) {
        try {
            // Data início/fim do mês
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0); // último dia do mês

            // 1. Verifica se já existe espelho criado
            const existing = await db.query(`
        SELECT * FROM time_mirrors 
        WHERE user_id = $1 
        AND EXTRACT(YEAR FROM period_start) = $2 
        AND EXTRACT(MONTH FROM period_start) = $3
      `, [userId, year, month]);

            if (existing.rows.length > 0) {
                return existing.rows[0];
            }

            // 2. Busca dados do relatório
            const reportContent = await reportsService.getMonthlyReport(userId, year, month);

            // 3. Cria hash inicial dos DADOS (integridade do conteúdo)
            const dataString = JSON.stringify(reportContent);
            const contentHash = crypto.createHash('sha256').update(dataString).digest('hex');

            // 4. Salva o registro inicial (ainda não assinado)
            const result = await db.query(`
        INSERT INTO time_mirrors 
        (user_id, period_start, period_end, status, signature_hash)
        VALUES ($1, $2, $3, 'pending', $4)
        RETURNING *
      `, [userId, startDate, endDate, contentHash]);

            logger.info('Espelho gerado para usuário', { userId, month, year });
            return result.rows[0];

        } catch (error) {
            logger.error('Erro ao gerar espelho', { error: error.message });
            throw error;
        }
    }

    // Assina o espelho
    async sign(mirrorId, userId, req) {
        try {
            const mirrorResult = await db.query(`
        SELECT * FROM time_mirrors WHERE id = $1 AND user_id = $2
      `, [mirrorId, userId]);

            if (mirrorResult.rows.length === 0) {
                throw new Error('Espelho não encontrado');
            }

            const mirror = mirrorResult.rows[0];

            if (mirror.status === 'signed') {
                throw new Error('Espelho já assinado');
            }

            // Cria metadados da assinatura
            const signatureData = {
                mirrorId: mirror.id,
                userId: userId,
                signedAt: new Date().toISOString(),
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent'],
                originalHash: mirror.signature_hash // Vincula ao conteúdo original
            };

            // Gera hash FINAL da assinatura digital
            const finalHash = crypto.createHash('sha256').update(JSON.stringify(signatureData)).digest('hex');

            // Atualiza registro
            const result = await db.query(`
        UPDATE time_mirrors 
        SET status = 'signed', 
            signed_at = NOW(),
            signature_hash = $1,
            ip_address = $2,
            user_agent = $3
        WHERE id = $4
        RETURNING *
      `, [finalHash, signatureData.ip, signatureData.userAgent, mirrorId]);

            logger.info('Espelho assinado eletronicamente', { mirrorId, userId });
            return result.rows[0];

        } catch (error) {
            logger.error('Erro ao assinar espelho', { error: error.message });
            throw error;
        }
    }

    async getByUser(userId) {
        return db.query('SELECT * FROM time_mirrors WHERE user_id = $1 ORDER BY period_start DESC', [userId]);
    }
}

module.exports = new TimeMirrorsService();
