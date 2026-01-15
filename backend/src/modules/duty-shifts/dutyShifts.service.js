const db = require('../../config/database');
const logger = require('../../utils/logger');

class DutyShiftsService {

  async markPresence(userId, photo = null, notes = null, timestamp = null) {
    try {
      const markDate = timestamp ? new Date(timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      // Verificar se já marcou presença nesta data
      const existing = await db.query(`
      SELECT id FROM duty_shifts 
      WHERE user_id = $1 AND date = $2
    `, [userId, markDate]);

      if (existing.rows.length > 0) {
        throw new Error('Você já marcou presença nesta data');
      }

      // Buscar usuário para log e retorno
      const userRes = await db.query('SELECT nome FROM users WHERE id = $1', [userId]);
      const user = userRes.rows[0];

      const result = await db.query(`
        INSERT INTO duty_shifts (user_id, date, check_in_time, photo_url, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, date, check_in_time
      `, [userId, markDate, timestamp || 'NOW()', photo, notes]);

      return {
        id: result.rows[0].id,
        user_name: user.nome,
        check_in_time: result.rows[0].check_in_time,
        date: result.rows[0].date
      };

    } catch (error) {
      logger.error('Erro ao marcar presença', { error: error.message });
      throw error;
    }
  }

  // Buscar plantões de um corretor
  async getBrokerShifts(userId, startDate, endDate) {
    try {
      const result = await db.query(`
        SELECT 
          ds.*,
          u.nome,
          u.matricula
        FROM duty_shifts ds
        JOIN users u ON ds.user_id = u.id
        WHERE ds.user_id = $1
        AND ds.date BETWEEN $2 AND $3
        ORDER BY ds.date DESC
      `, [userId, startDate, endDate]);

      return result.rows;

    } catch (error) {
      logger.error('Erro ao buscar plantões', { error: error.message });
      throw error;
    }
  }

  // Relatório mensal de todos os corretores
  async getMonthlyReport(year, month) {
    try {
      const result = await db.query(`
        SELECT 
          u.id,
          u.matricula,
          u.nome,
          u.cargo,
          COUNT(ds.id) as total_plantoes,
          ARRAY_AGG(ds.date ORDER BY ds.date) FILTER (WHERE ds.date IS NOT NULL) as datas_presenca,
          MIN(ds.check_in_time) as primeiro_plantao,
          MAX(ds.check_in_time) as ultimo_plantao
        FROM users u
        LEFT JOIN duty_shifts ds ON u.id = ds.user_id 
          AND EXTRACT(YEAR FROM ds.date) = $1
          AND EXTRACT(MONTH FROM ds.date) = $2
        WHERE u.is_duty_shift_only = true
        AND u.status = 'ativo'
        GROUP BY u.id
        ORDER BY total_plantoes DESC, u.nome ASC
      `, [year, month]);

      return {
        year,
        month,
        total_corretores: result.rows.length,
        corretores: result.rows
      };

    } catch (error) {
      logger.error('Erro ao gerar relatório mensal', { error: error.message });
      throw error;
    }
  }

  // Dashboard: quem está presente hoje
  async getTodayPresence() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const result = await db.query(`
        SELECT 
          u.id,
          u.matricula,
          u.nome,
          u.cargo,
          ds.check_in_time,
          ds.notes
        FROM duty_shifts ds
        JOIN users u ON ds.user_id = u.id
        WHERE ds.date = $1
        ORDER BY ds.check_in_time DESC
      `, [today]);

      return {
        date: today,
        total_presentes: result.rows.length,
        corretores: result.rows
      };

    } catch (error) {
      logger.error('Erro ao buscar presença de hoje', { error: error.message });
      throw error;
    }
  }

  // Estatísticas de um corretor
  async getBrokerStats(userId, startDate, endDate) {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_plantoes,
          MIN(date) as primeiro_plantao,
          MAX(date) as ultimo_plantao,
          ROUND(
            COUNT(*)::numeric / 
            (DATE_PART('day', $3::date - $2::date) + 1) * 100, 
            2
          ) as percentual_presenca
        FROM duty_shifts
        WHERE user_id = $1
        AND date BETWEEN $2 AND $3
      `, [userId, startDate, endDate]);

      return result.rows[0];

    } catch (error) {
      logger.error('Erro ao calcular estatísticas', { error: error.message });
      throw error;
    }
  }

  // Exportar relatório mensal em Excel
  async exportMonthlyReport(year, month) {
    try {
      const XLSX = require('xlsx');
      const report = await this.getMonthlyReport(year, month);

      // Preparar dados para Excel
      const data = report.corretores.map(corretor => ({
        'Matrícula': corretor.matricula,
        'Nome': corretor.nome,
        'Cargo': corretor.cargo || '-',
        'Total de Plantões': corretor.total_plantoes,
        'Primeiro Plantão': corretor.primeiro_plantao ?
          new Date(corretor.primeiro_plantao).toLocaleDateString('pt-BR') : '-',
        'Último Plantão': corretor.ultimo_plantao ?
          new Date(corretor.ultimo_plantao).toLocaleDateString('pt-BR') : '-',
        'Datas de Presença': corretor.datas_presenca ?
          corretor.datas_presenca.map(d => new Date(d).toLocaleDateString('pt-BR')).join(', ') : '-'
      }));

      // Criar planilha
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Plantões ${month}/${year}`);

      // Ajustar largura das colunas
      ws['!cols'] = [
        { wch: 12 },
        { wch: 30 },
        { wch: 25 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 50 }
      ];

      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    } catch (error) {
      logger.error('Erro ao exportar relatório', { error: error.message });
      throw error;
    }
  }
}

module.exports = new DutyShiftsService();