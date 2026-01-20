const timeMirrorsService = require('./timeMirrors.service');
const reportsService = require('../reports/reports.service');
const pdfGenerator = require('../../services/pdfGeneratorService');
const db = require('../../config/database');

class TimeMirrorsController {

    // Gerar espelho (para visualização antes de assinar)
    async generate(req, res, next) {
        try {
            const { year, month } = req.query;
            const userId = req.userId; // Do token

            if (!year || !month) {
                return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
            }

            const mirror = await timeMirrorsService.generate(userId, year, month);

            res.json({
                success: true,
                data: mirror
            });

        } catch (error) {
            next(error);
        }
    }

    // Assinar espelho
    async sign(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.userId;

            const signedMirror = await timeMirrorsService.sign(id, userId, req);

            res.json({
                success: true,
                message: 'Espelho assinado com sucesso',
                data: signedMirror
            });

        } catch (error) {
            next(error);
        }
    }

    // Listar meus espelhos
    async getMyMirrors(req, res, next) {
        try {
            const result = await timeMirrorsService.getByUser(req.userId);
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            next(error);
        }
    }
    // Baixar PDF Assinado
    async downloadPdf(req, res, next) {
        try {
            const { id } = req.params;

            // 1. Busca dados do espelho e usuário
            const mirrorResult = await db.query(`
                SELECT tm.*, u.id as user_id, u.nome, u.matricula, u.cargo, u.status,
                       EXTRACT(YEAR FROM tm.period_start) as year,
                       EXTRACT(MONTH FROM tm.period_start) as month
                FROM time_mirrors tm
                JOIN users u ON tm.user_id = u.id
                WHERE tm.id = $1
            `, [id]);

            if (mirrorResult.rows.length === 0) {
                return res.status(404).json({ error: 'Espelho de ponto não encontrado' });
            }

            const mirror = mirrorResult.rows[0];

            // 2. Validação de acesso (apenas próprio usuário ou admin/gestor)
            if (req.userRole === 'funcionario' && mirror.user_id !== req.userId) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            // 3. Busca dados detalhados do relatório para o mês
            const reportData = await reportsService.getMonthlyReport(mirror.user_id, mirror.year, mirror.month);

            const userData = {
                user: {
                    nome: mirror.nome,
                    matricula: mirror.matricula,
                    cargo: mirror.cargo,
                    status: mirror.status
                },
                period: {
                    month: mirror.month,
                    year: mirror.year
                }
            };

            const signatureData = mirror.status === 'signed' ? {
                hash: mirror.signature_hash,
                date: mirror.signed_at,
                ip: mirror.ip_address || 'N/A'
            } : null;

            // 4. Gera e envia o Stream do PDF
            const pdfDoc = await pdfGenerator.generateTimeMirror(userData, reportData, signatureData);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=espelho-${mirror.year}-${mirror.month}.pdf`);

            pdfDoc.pipe(res);
            pdfDoc.end();

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TimeMirrorsController();
