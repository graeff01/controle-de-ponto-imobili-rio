const db = require('../../config/database');
const logger = require('../../utils/logger');
const dateHelper = require('../../utils/dateHelper');

class ReportsService {

async getDashboardStats() {
    try {
      // Stats de funcionários CLT (ponto completo)
      const employeeStats = await db.query(`
        SELECT 
          COUNT(DISTINCT tr.user_id) as presentes
        FROM time_records tr
        JOIN users u ON tr.user_id = u.id
        WHERE DATE(tr.timestamp) = CURRENT_DATE
        AND tr.record_type = 'entrada'
        AND u.is_duty_shift_only = false
      `);

      const totalEmployees = await db.query(`
        SELECT COUNT(*) as total 
        FROM users 
        WHERE status = 'ativo' 
        AND is_duty_shift_only = false
      `);

      // Sem saída (funcionários CLT)
      const semSaidaResult = await db.query(`
        SELECT COUNT(DISTINCT user_id) as total
        FROM time_records
        WHERE DATE(timestamp) = CURRENT_DATE
        AND record_type = 'entrada'
        AND user_id NOT IN (
          SELECT user_id FROM time_records 
          WHERE DATE(timestamp) = CURRENT_DATE 
          AND record_type = 'saida_final'
        )
      `);

      // Stats de corretores plantonistas
      const brokersPresent = await db.query(`
        SELECT COUNT(DISTINCT user_id) as presentes
        FROM duty_shifts
        WHERE date = CURRENT_DATE
      `);

      const totalBrokers = await db.query(`
        SELECT COUNT(*) as total 
        FROM users 
        WHERE status = 'ativo' 
        AND is_duty_shift_only = true
      `);

      const employees_presentes = parseInt(employeeStats.rows[0].presentes);
      const employees_total = parseInt(totalEmployees.rows[0].total);
      const brokers_presentes = parseInt(brokersPresent.rows[0].presentes);
      const brokers_total = parseInt(totalBrokers.rows[0].total);

      return {
        employees: {
          presentes: employees_presentes,
          total: employees_total,
          ausencias: employees_total - employees_presentes,
          sem_saida: parseInt(semSaidaResult.rows[0].total)
        },
        brokers: {
          presentes: brokers_presentes,
          total: brokers_total,
          ausentes: brokers_total - brokers_presentes
        },
        geral: {
          total_presentes: employees_presentes + brokers_presentes,
          total_funcionarios: employees_total + brokers_total
        },
        alertas: 0 // Mantido para compatibilidade
      };

    } catch (error) {
      logger.error('Erro ao buscar estatísticas do dashboard', { error: error.message });
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
}

module.exports = new ReportsService();
