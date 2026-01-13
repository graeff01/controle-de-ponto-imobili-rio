const timeMirrorsService = require('./timeMirrors.service');

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
            const pdfService = require('../../services/pdfService'); // Lazy load
            const db = require('../../config/database');

            // Busca dados
            const result = await db.query(`
        SELECT tm.*, u.nome, u.matricula, u.cargo 
        FROM time_mirrors tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.id = $1
      `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Espelho não encontrado' });
            }

            const mirror = result.rows[0];

            // Validação de acesso (apenas próprio usuário ou admin/gestor)
            if (req.userRole === 'funcionario' && mirror.user_id !== req.userId) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=espelho-${mirror.period_start.toISOString().slice(0, 7)}.pdf`);

            await pdfService.generateMirrorPdf(mirror, {
                nome: mirror.nome,
                matricula: mirror.matricula,
                cargo: mirror.cargo
            }, res);

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TimeMirrorsController();
