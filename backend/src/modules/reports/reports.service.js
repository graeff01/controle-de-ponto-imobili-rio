const db = require('../../config/database');
const logger = require('../../utils/logger');
const dateHelper = require('../../utils/dateHelper');

class ReportsService {

  async getDashboardStats() {
    try {
      // 1. Stats de funcionários CLT
      const employeeStats = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE u.is_duty_shift_only = false) as total_clt,
          COUNT(DISTINCT tr.user_id) FILTER (WHERE u.is_duty_shift_only = false AND DATE(tr.timestamp) = CURRENT_DATE AND tr.record_type = 'entrada') as presentes_clt,
          COUNT(DISTINCT tr.user_id) FILTER (WHERE u.is_duty_shift_only = false AND DATE(tr.timestamp) = CURRENT_DATE AND tr.record_type = 'saida_final') as concluidos_clt
        FROM users u
        LEFT JOIN time_records tr ON u.id = tr.user_id AND DATE(tr.timestamp) = CURRENT_DATE
        WHERE u.status = 'ativo' AND u.is_duty_shift_only = false
      `);

      // 2. Stats de corretores plantonistas
      const brokerStats = await db.query(`
        SELECT 
          COUNT(*) as total_pj,
          (SELECT COUNT(DISTINCT user_id) FROM duty_shifts WHERE date = CURRENT_DATE) as presentes_pj
        FROM users 
        WHERE status = 'ativo' AND is_duty_shift_only = true
      `);

      // 3. Inconsistências (Últimos 7 dias)
      const inconsistencias = await db.query(`
        SELECT COUNT(*) as total
        FROM (
          SELECT user_id, DATE(timestamp) as data
          FROM time_records
          WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY user_id, DATE(timestamp)
          HAVING 
            COUNT(*) FILTER (WHERE record_type = 'entrada') != COUNT(*) FILTER (WHERE record_type = 'saida_final')
            OR COUNT(*) FILTER (WHERE record_type = 'saida_intervalo') != COUNT(*) FILTER (WHERE record_type = 'retorno_intervalo')
        ) as sub
      `);

      // 4. Resumo Banco de Horas (Total Acumulado)
      const bancoHoras = await db.query(`
        SELECT
          SUM(balance) FILTER (WHERE balance > 0) as credito_total,
          SUM(balance) FILTER (WHERE balance < 0) as debito_total
        FROM hours_bank
      `);

      // 5. Jornadas incompletas (entrada sem saída nos últimos 3 dias úteis)
      const jornadasIncompletas = await db.query(`
        SELECT DISTINCT u.id, u.nome, u.matricula,
          DATE(tr.timestamp) as data,
          MAX(tr.record_type) as ultimo_tipo
        FROM time_records tr
        JOIN users u ON tr.user_id = u.id
        WHERE DATE(tr.timestamp) >= CURRENT_DATE - INTERVAL '3 days'
          AND DATE(tr.timestamp) < CURRENT_DATE
          AND u.is_duty_shift_only = false
          AND u.status = 'ativo'
        GROUP BY u.id, u.nome, u.matricula, DATE(tr.timestamp)
        HAVING COUNT(*) FILTER (WHERE tr.record_type = 'entrada') > 0
          AND COUNT(*) FILTER (WHERE tr.record_type = 'saida_final') = 0
        ORDER BY data DESC
      `);

      const clt = employeeStats.rows[0];
      const pj = brokerStats.rows[0];
      const bh = bancoHoras.rows[0];

      return {
        clt: {
          total: parseInt(clt.total_clt) || 0,
          presentes: parseInt(clt.presentes_clt) || 0,
          ausentes: Math.max(0, (parseInt(clt.total_clt) || 0) - (parseInt(clt.presentes_clt) || 0)),
          concluidos: parseInt(clt.concluidos_clt) || 0,
          sem_saida: (parseInt(clt.presentes_clt) || 0) - (parseInt(clt.concluidos_clt) || 0)
        },
        pj: {
          total: parseInt(pj.total_pj) || 0,
          presentes: parseInt(pj.presentes_pj) || 0,
          ausentes: Math.max(0, (parseInt(pj.total_pj) || 0) - (parseInt(pj.presentes_pj) || 0))
        },
        analytics: {
          inconsistencias: parseInt(inconsistencias.rows[0].total) || 0,
          banco_horas: {
            credito: parseFloat(bh.credito_total || 0).toFixed(1),
            debito: Math.abs(parseFloat(bh.debito_total || 0)).toFixed(1)
          },
          jornadas_incompletas: jornadasIncompletas.rows
        }
      };

    } catch (error) {
      logger.error('Erro ao buscar estatísticas expandidas do dashboard', { error: error.message });
      throw error;
    }
  }

  async getWeeklyReport(userId = null) {
    try {
      const startOfWeek = dateHelper.getStartOfWeek();
      const endOfWeek = dateHelper.getEndOfWeek();

      let query = `
        SELECT 
          u.id, u.nome, u.matricula, u.cargo,
          COUNT(DISTINCT DATE(tr.timestamp)) as dias_trabalhados,
          COALESCE(SUM(hwd.hours_worked), 0) as total_horas
        FROM users u
        LEFT JOIN time_records tr ON u.id = tr.user_id 
          AND DATE(tr.timestamp) BETWEEN $1 AND $2
        LEFT JOIN hours_worked_daily hwd ON u.id = hwd.user_id 
          AND hwd.date BETWEEN $1 AND $2
        WHERE u.status = 'ativo'
      `;

      const params = [startOfWeek, endOfWeek];

      if (userId) {
        query += ` AND u.id = $3`;
        params.push(userId);
      }

      query += ` GROUP BY u.id ORDER BY u.nome`;

      const result = await db.query(query, params);

      return {
        periodo: {
          inicio: dateHelper.formatDateBR(startOfWeek),
          fim: dateHelper.formatDateBR(endOfWeek)
        },
        dados: result.rows
      };

    } catch (error) {
      logger.error('Erro ao gerar relatório semanal', { error: error.message });
      throw error;
    }
  }

  async getMonthlyReport(userId, year, month) {
    try {
      const result = await db.query(`
        SELECT 
          dj.*,
          hwd.hours_worked,
          hwd.status,
          CASE 
            WHEN dj.entrada IS NULL THEN 'Ausente'
            WHEN dj.saida_final IS NULL THEN 'Incompleto'
            ELSE 'Completo'
          END as status_dia
        FROM daily_journey dj
        LEFT JOIN hours_worked_daily hwd ON dj.user_id = hwd.user_id AND dj.date = hwd.date
        WHERE dj.user_id = $1
        AND EXTRACT(YEAR FROM dj.date) = $2
        AND EXTRACT(MONTH FROM dj.date) = $3
        ORDER BY dj.date ASC
      `, [userId, year, month]);

      // Calcula totais
      let totalHoras = 0;
      let diasCompletos = 0;
      let diasIncompletos = 0;
      let ausencias = 0;

      result.rows.forEach(row => {
        if (row.hours_worked) totalHoras += parseFloat(row.hours_worked);
        if (row.status_dia === 'Completo') diasCompletos++;
        if (row.status_dia === 'Incompleto') diasIncompletos++;
        if (row.status_dia === 'Ausente') ausencias++;
      });

      return {
        periodo: {
          mes: month,
          ano: year
        },
        resumo: {
          total_horas: totalHoras.toFixed(2),
          dias_completos: diasCompletos,
          dias_incompletos: diasIncompletos,
          ausencias: ausencias
        },
        detalhes: result.rows
      };

    } catch (error) {
      logger.error('Erro ao gerar relatório mensal', { error: error.message });
      throw error;
    }
  }

  async getActivityLog(limit = 50) {
    try {
      const result = await db.query(`
        SELECT 
          tr.id,
          tr.record_type,
          tr.timestamp,
          tr.is_manual,
          u.nome,
          u.matricula
        FROM time_records tr
        JOIN users u ON tr.user_id = u.id
        ORDER BY tr.timestamp DESC
        LIMIT $1
      `, [limit]);

      return result.rows;

    } catch (error) {
      logger.error('Erro ao buscar log de atividades', { error: error.message });
      throw error;
    }
  }


  // --- ANALYTICS RH ---

  async getAbsenteismoStats() {
    try {
      // Taxa de absenteísmo global dos últimos 30 dias
      const result = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE dj.entrada IS NULL AND h.id IS NULL AND extract(dow from dj.date) not in (0,6)) as faltas,
          COUNT(*) FILTER (WHERE extract(dow from dj.date) not in (0,6)) as dias_uteis_totais
        FROM daily_journey dj
        LEFT JOIN holidays h ON dj.date = h.date
        WHERE dj.date >= CURRENT_DATE - INTERVAL '30 days'
      `);

      const faltas = parseInt(result.rows[0].faltas);
      const total = parseInt(result.rows[0].dias_uteis_totais);
      const taxa = total > 0 ? ((faltas / total) * 100).toFixed(2) : 0;

      return {
        taxa_absenteismo: taxa,
        total_faltas: faltas,
        total_dias_analisados: total,
        periodo: 'Últimos 30 dias'
      };
    } catch (error) {
      logger.error('Erro stats absenteismo', error);
      throw error;
    }
  }

  async getOvertimeStats() {
    try {
      // Top 5 funcionários com mais horas extras no mês atual
      const result = await db.query(`
        SELECT 
          u.nome,
          SUM(hb.balance) as saldo_minutos
        FROM hours_bank hb
        JOIN users u ON hb.user_id = u.id
        WHERE hb.date >= date_trunc('month', CURRENT_DATE)
        AND hb.balance > 0
        GROUP BY u.id, u.nome
        ORDER BY saldo_minutos DESC
        LIMIT 5
      `);

      return result.rows.map(r => ({
        nome: r.nome,
        horas_extras: parseFloat(r.saldo_minutos || 0).toFixed(2)
      }));
    } catch (error) {
      logger.error('Erro stats overtime', error);
      throw error;
    }
  }
}

module.exports = new ReportsService();
