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

      // Hoje em BRT (servidor Railway roda UTC)
      const hojeStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      const [hojeY, hojeM, hojeD] = hojeStr.split('-').map(Number);

      // Buscar TODOS os registros de ponto do mês COM conversão timezone UTC→BRT
      const records = await db.query(`
        SELECT
          record_type,
          to_char(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') as data,
          to_char(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') as hora
        FROM time_records
        WHERE user_id = $1
          AND EXTRACT(YEAR FROM timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = $2
          AND EXTRACT(MONTH FROM timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = $3
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

      // Iterar por todos os dias do mês (até hoje ou fim do mês, usando data BRT)
      const ultimoDia = new Date(year, month, 0).getDate();
      const diaLimite = (parseInt(year) === hojeY && parseInt(month) === hojeM)
        ? hojeD : ultimoDia;

      for (let d = 1; d <= diaLimite; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, d);
        const dow = dateObj.getDay();
        const isFds = dow === 0 || dow === 6;
        const isFeriado = feriadosDates.includes(dateStr);
        const isHoje = (parseInt(year) === hojeY && parseInt(month) === hojeM && d === hojeD);

        // Hoje: expected=0 (dia em andamento, não debitar ainda)
        const esperadas = (isFds || isFeriado || isHoje) ? 0 : expectedDaily;

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

        // Incluir: dias com registro, OU dias úteis passados (hoje sem registro não aparece)
        const temRegistro = Object.keys(dia).length > 0;
        if (temRegistro || (!isFds && !isFeriado && !isHoje)) {
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
            is_feriado: isFeriado,
            is_hoje: isHoje
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
      const currentMonth = parseInt(month) || new Date().getMonth() + 1;
      const currentYear = parseInt(year) || new Date().getFullYear();
      const subordinateIds = await getSubordinateIds(req.userId);

      // Hoje em BRT
      const hojeStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      const [hojeY, hojeM, hojeD] = hojeStr.split('-').map(Number);

      // Buscar feriados do mês
      let feriadosDates = [];
      try {
        const ferRes = await db.query('SELECT date::text as dt FROM holidays WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2', [currentYear, currentMonth]);
        feriadosDates = ferRes.rows.map(r => r.dt);
      } catch (e) {}

      // Buscar usuários
      let userQuery = 'SELECT id, nome, matricula, cargo, expected_daily_hours FROM users WHERE status = $1';
      let userParams = ['ativo'];

      if (subordinateIds) {
        const placeholders = subordinateIds.map((_, i) => `$${i + 2}`).join(', ');
        userQuery += ` AND id IN (${placeholders})`;
        userParams = [...userParams, ...subordinateIds];
      }

      userQuery += ' ORDER BY nome';
      const usersResult = await db.query(userQuery, userParams);

      // Buscar todos os registros do mês com timezone UTC→BRT
      const records = await db.query(`
        SELECT
          user_id,
          record_type,
          to_char(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') as dia,
          to_char(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') as hora
        FROM time_records
        WHERE EXTRACT(YEAR FROM timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = $1
          AND EXTRACT(MONTH FROM timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = $2
        ORDER BY timestamp ASC
      `, [currentYear, currentMonth]);

      // Agrupar registros por usuário e dia
      const recordsByUser = {};
      records.rows.forEach(r => {
        if (!recordsByUser[r.user_id]) recordsByUser[r.user_id] = {};
        if (!recordsByUser[r.user_id][r.dia]) recordsByUser[r.user_id][r.dia] = {};
        recordsByUser[r.user_id][r.dia][r.record_type] = r.hora;
      });

      // Calcular dias do período
      const ultimoDia = new Date(currentYear, currentMonth, 0).getDate();
      const diaLimite = (currentYear === hojeY && currentMonth === hojeM)
        ? hojeD : ultimoDia;

      // Calcular para cada usuário
      const data = usersResult.rows.map(user => {
        const expectedDaily = parseFloat(user.expected_daily_hours || 9);
        const userRecords = recordsByUser[user.id] || {};
        let totalWorked = 0;
        let totalExpected = 0;

        for (let d = 1; d <= diaLimite; d++) {
          const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dateObj = new Date(currentYear, currentMonth - 1, d);
          const dow = dateObj.getDay();
          const isFds = dow === 0 || dow === 6;
          const isFeriado = feriadosDates.includes(dateStr);
          const isHoje = (currentYear === hojeY && currentMonth === hojeM && d === hojeD);

          const esperadas = (isFds || isFeriado || isHoje) ? 0 : expectedDaily;

          const dia = userRecords[dateStr] || {};
          let trabalhadas = 0;

          if (dia.entrada && dia.saida_final) {
            const [eh, em] = dia.entrada.split(':').map(Number);
            const [sh, sm] = dia.saida_final.split(':').map(Number);
            let totalMin = (sh * 60 + sm) - (eh * 60 + em);

            if (dia.saida_intervalo && dia.retorno_intervalo) {
              const [sih, sim] = dia.saida_intervalo.split(':').map(Number);
              const [rih, rim] = dia.retorno_intervalo.split(':').map(Number);
              const pausa = (rih * 60 + rim) - (sih * 60 + sim);
              if (pausa > 0) totalMin -= pausa;
            }

            trabalhadas = Math.max(0, totalMin / 60);
          }

          totalWorked += trabalhadas;
          totalExpected += esperadas;
        }

        const saldo = totalWorked - totalExpected;
        return {
          id: user.id,
          nome: user.nome,
          matricula: user.matricula,
          cargo: user.cargo,
          total_horas_trabalhadas: totalWorked.toFixed(2),
          total_horas_esperadas: totalExpected.toFixed(2),
          saldo_total: saldo.toFixed(2)
        };
      });

      data.sort((a, b) => parseFloat(a.saldo_total) - parseFloat(b.saldo_total));

      res.json({ success: true, data });

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