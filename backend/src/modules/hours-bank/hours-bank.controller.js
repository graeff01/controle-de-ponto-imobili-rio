const db = require('../../config/database');
const logger = require('../../utils/logger');

class HoursBankController {

  async getUserBalance(req, res, next) {
    try {
      const { userId } = req.params;
      const { month, year } = req.query;

      let query = `
        SELECT 
          hb.*,
          u.nome,
          u.matricula
        FROM hours_bank hb
        JOIN users u ON hb.user_id = u.id
        WHERE hb.user_id = $1
      `;

      const params = [userId];

      if (month && year) {
        params.push(year, month);
        query += ` AND EXTRACT(YEAR FROM hb.date) = $2 AND EXTRACT(MONTH FROM hb.date) = $3`;
      }

      query += ` ORDER BY hb.date DESC`;

      const result = await db.query(query, params);

      // Calcular saldo total
      const saldoTotal = result.rows.reduce((acc, row) => acc + parseFloat(row.balance), 0);

      res.json({
        success: true,
        data: {
          registros: result.rows,
          saldo_total: saldoTotal.toFixed(2),
          total_horas_trabalhadas: result.rows.reduce((acc, row) => acc + parseFloat(row.hours_worked), 0).toFixed(2),
          total_horas_esperadas: result.rows.reduce((acc, row) => acc + parseFloat(row.hours_expected), 0).toFixed(2)
        }
      });

    } catch (error) {
      logger.error('Erro ao buscar saldo do usuário', { error: error.message });
      next(error);
    }
  }

  async getAllUsers(req, res, next) {
    try {
      const { month, year } = req.query;
      const currentMonth = month || new Date().getMonth() + 1;
      const currentYear = year || new Date().getFullYear();

      const result = await db.query(`
        SELECT 
          u.id,
          u.nome,
          u.matricula,
          u.cargo,
          COALESCE(SUM(hb.hours_worked), 0) as total_horas_trabalhadas,
          COALESCE(SUM(hb.hours_expected), 0) as total_horas_esperadas,
          COALESCE(SUM(hb.balance), 0) as saldo_total
        FROM users u
        LEFT JOIN hours_bank hb ON u.id = hb.user_id 
          AND EXTRACT(YEAR FROM hb.date) = $1 
          AND EXTRACT(MONTH FROM hb.date) = $2
        WHERE u.status = 'ativo'
        GROUP BY u.id
        ORDER BY saldo_total DESC
      `, [currentYear, currentMonth]);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      logger.error('Erro ao listar todos os usuários', { error: error.message });
      next(error);
    }
  }

  // Método ajustar saldo
  async ajustarSaldo(req, res, next) {
    try {
      const { user_id, date, hours_worked, hours_expected, reason } = req.body;

      if (!user_id || !date) {
        return res.status(400).json({
          success: false,
          error: 'user_id e date são obrigatórios'
        });
      }

      // Calcular balance
      const worked = parseFloat(hours_worked) || 0;
      const expected = parseFloat(hours_expected) || 8;
      const balance = worked - expected;

      await db.query(`
        INSERT INTO hours_bank (user_id, date, hours_worked, hours_expected, balance)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, date) 
        DO UPDATE SET 
          hours_worked = $3,
          hours_expected = $4,
          balance = $5,
          updated_at = NOW()
      `, [user_id, date, worked, expected, balance]);

      logger.success('Banco de horas ajustado', { user_id, date, reason });

      res.json({
        success: true,
        message: 'Banco de horas ajustado com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao ajustar saldo', { error: error.message });
      next(error);
    }
  }
}

module.exports = new HoursBankController();