const db = require('../../config/database');
const logger = require('../../utils/logger');

class MonthlyClosingController {

  async getStatus(req, res) {
    try {
      const { year, month } = req.params;
      const result = await db.query(
        'SELECT * FROM monthly_closings WHERE year = $1 AND month = $2',
        [year, month]
      );

      res.json({
        success: true,
        data: {
          closed: result.rows.length > 0,
          closing: result.rows[0] || null
        }
      });
    } catch (error) {
      logger.error('Erro ao verificar fechamento', { error: error.message });
      res.status(500).json({ error: 'Erro ao verificar status do mês' });
    }
  }

  async listAll(req, res) {
    try {
      const result = await db.query(`
        SELECT mc.*, u.nome as closed_by_name
        FROM monthly_closings mc
        LEFT JOIN users u ON mc.closed_by = u.id
        ORDER BY mc.year DESC, mc.month DESC
      `);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      logger.error('Erro ao listar fechamentos', { error: error.message });
      res.status(500).json({ error: 'Erro ao listar fechamentos' });
    }
  }

  async closeMonth(req, res) {
    try {
      const { year, month, notes } = req.body;

      if (!year || !month) {
        return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
      }

      // Verificar se já está fechado
      const existing = await db.query(
        'SELECT id FROM monthly_closings WHERE year = $1 AND month = $2',
        [year, month]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Este mês já está fechado' });
      }

      // Verificar se há ajustes pendentes para este mês
      const pending = await db.query(`
        SELECT COUNT(*) as total FROM time_adjustments
        WHERE status = 'pending'
        AND EXTRACT(YEAR FROM adjusted_timestamp) = $1
        AND EXTRACT(MONTH FROM adjusted_timestamp) = $2
      `, [year, month]);

      if (parseInt(pending.rows[0].total) > 0) {
        return res.status(400).json({
          error: `Existem ${pending.rows[0].total} ajuste(s) pendente(s) neste mês. Aprove ou rejeite antes de fechar.`
        });
      }

      const result = await db.query(`
        INSERT INTO monthly_closings (year, month, closed_by, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [year, month, req.userId, notes || null]);

      logger.info('Mês fechado', { year, month, closedBy: req.userId });

      res.json({
        success: true,
        message: `Mês ${month}/${year} fechado com sucesso`,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Erro ao fechar mês', { error: error.message });
      res.status(500).json({ error: 'Erro ao fechar mês' });
    }
  }

  async reopenMonth(req, res) {
    try {
      const { year, month } = req.body;

      const result = await db.query(
        'DELETE FROM monthly_closings WHERE year = $1 AND month = $2 RETURNING *',
        [year, month]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Este mês não está fechado' });
      }

      logger.info('Mês reaberto', { year, month, reopenedBy: req.userId });

      res.json({
        success: true,
        message: `Mês ${month}/${year} reaberto com sucesso`
      });
    } catch (error) {
      logger.error('Erro ao reabrir mês', { error: error.message });
      res.status(500).json({ error: 'Erro ao reabrir mês' });
    }
  }
}

module.exports = new MonthlyClosingController();
