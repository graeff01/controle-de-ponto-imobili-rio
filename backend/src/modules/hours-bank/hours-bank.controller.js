const db = require('../../config/database');
const logger = require('../../utils/logger');
const { getSubordinateIds } = require('../../utils/subordinateHelper');

class HoursBankController {

  async getUserBalance(req, res, next) {
    try {
      const { userId } = req.params;
      const { month, year } = req.query;

      if (!month || !year) {
        return res.status(400).json({ success: false, error: 'month e year são obrigatórios' });
      }

      // Buscar config do usuário
      const userRes = await db.query('SELECT nome, matricula, expected_daily_hours FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
      const user = userRes.rows[0];
      const expectedDaily = parseFloat(user.expected_daily_hours || 9);

      // Buscar feriados do mês
      let feriadosDates = [];
      try {
        const ferRes = await db.query('SELECT date::text as dt FROM holidays WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2', [year, month]);
        feriadosDates = ferRes.rows.map(r => r.dt);
      } catch (e) { /* tabela pode não existir */ }

      // Buscar TODOS os registros de ponto do mês (com hora local correta)
      const records = await db.query(`
        SELECT
          record_type,
          to_char(timestamp, 'YYYY-MM-DD') as data,
          to_char(timestamp, 'HH24:MI') as hora
        FROM time_records
        WHERE user_id = $1
          AND EXTRACT(YEAR FROM timestamp) = $2
          AND EXTRACT(MONTH FROM timestamp) = $3
        ORDER BY timestamp ASC
      `, [userId, year, month]);

      // Agrupar por dia
      const porDia = {};
      records.rows.forEach(r => {
        if (!porDia[r.data]) porDia[r.data] = {};
        porDia[r.data][r.record_type] = r.hora;
      });

      // Montar registros dia a dia
      const registros = [];
      let totalTrabalhadas = 0;
      let totalEsperadas = 0;

      // Iterar por todos os dias do mês (até hoje ou fim do mês)
      const hoje = new Date();
      const ultimoDia = new Date(year, month, 0).getDate();
      const diaLimite = (parseInt(year) === hoje.getFullYear() && parseInt(month) === hoje.getMonth() + 1)
        ? hoje.getDate() : ultimoDia;

      for (let d = 1; d <= diaLimite; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, d);
        const dow = dateObj.getDay();
        const isFds = dow === 0 || dow === 6;
        const isFeriado = feriadosDates.includes(dateStr);
        const esperadas = (isFds || isFeriado) ? 0 : expectedDaily;

        const dia = porDia[dateStr] || {};
        let trabalhadas = 0;

        // Calcular horas trabalhadas se tem entrada e saída
        if (dia.entrada && dia.saida_final) {
          const [eh, em] = dia.entrada.split(':').map(Number);
          const [sh, sm] = dia.saida_final.split(':').map(Number);
          let totalMin = (sh * 60 + sm) - (eh * 60 + em);

          // Descontar intervalo
          if (dia.saida_intervalo && dia.retorno_intervalo) {
            const [sih, sim] = dia.saida_intervalo.split(':').map(Number);
            const [rih, rim] = dia.retorno_intervalo.split(':').map(Number);
            const pausa = (rih * 60 + rim) - (sih * 60 + sim);
            if (pausa > 0) totalMin -= pausa;
          }

          trabalhadas = Math.max(0, totalMin / 60);
        }

        // Só incluir dias que têm registro OU dias úteis passados
        const temRegistro = Object.keys(dia).length > 0;
        if (temRegistro || (!isFds && !isFeriado)) {
          const saldo = trabalhadas - esperadas;
          totalTrabalhadas += trabalhadas;
          totalEsperadas += esperadas;

          registros.push({
            date: dateStr,
            entrada: dia.entrada || null,
            saida_intervalo: dia.saida_intervalo || null,
            retorno_intervalo: dia.retorno_intervalo || null,
            saida_final: dia.saida_final || null,
            hours_worked: trabalhadas.toFixed(2),
            hours_expected: esperadas.toFixed(2),
            balance: saldo.toFixed(2),
            is_fds: isFds,
            is_feriado: isFeriado
          });
        }
      }

      const saldoTotal = totalTrabalhadas - totalEsperadas;

      res.json({
        success: true,
        data: {
          registros,
          saldo_total: saldoTotal.toFixed(2),
          total_horas_trabalhadas: totalTrabalhadas.toFixed(2),
          total_horas_esperadas: totalEsperadas.toFixed(2)
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
      const subordinateIds = await getSubordinateIds(req.userId);

      let query = `
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
      `;
      let params = [currentYear, currentMonth];

      if (subordinateIds) {
        const placeholders = subordinateIds.map((_, i) => `$${i + 3}`).join(', ');
        query += ` AND u.id IN (${placeholders})`;
        params = [...params, ...subordinateIds];
      }

      query += ` GROUP BY u.id ORDER BY saldo_total DESC`;

      const result = await db.query(query, params);

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