const db = require('../../config/database');
const logger = require('../../utils/logger');
const auditService = require('../../services/auditService');
const notificationService = require('../../services/notificationService');

class AdjustmentsService {

  async createAdjustment(data, adjustedBy, req) {
    try {
      const { time_record_id, adjusted_timestamp, adjusted_type, reason } = data;

      // Busca registro original
      const recordResult = await db.query(`
        SELECT * FROM time_records WHERE id = $1
      `, [time_record_id]);

      if (recordResult.rows.length === 0) {
        throw new Error('Registro de ponto não encontrado');
      }

      const originalRecord = recordResult.rows[0];

      // Cria ajuste
      const result = await db.query(`
        INSERT INTO time_adjustments 
        (time_record_id, user_id, original_timestamp, original_type, 
         adjusted_timestamp, adjusted_type, reason, adjusted_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        time_record_id,
        originalRecord.user_id,
        originalRecord.timestamp,
        originalRecord.record_type,
        adjusted_timestamp,
        adjusted_type,
        reason,
        adjustedBy
      ]);

      const adjustment = result.rows[0];

      // Atualiza o registro original
      await db.query(`
        UPDATE time_records 
        SET timestamp = $1, record_type = $2, updated_at = NOW()
        WHERE id = $3
      `, [adjusted_timestamp, adjusted_type, time_record_id]);

      // Log de auditoria
      await auditService.log(
        'time_record_adjusted',
        adjustedBy,
        originalRecord.user_id,
        'Registro de ponto ajustado',
        { 
          recordId: time_record_id,
          original: { timestamp: originalRecord.timestamp, type: originalRecord.record_type },
          adjusted: { timestamp: adjusted_timestamp, type: adjusted_type },
          reason
        },
        req
      );

      // Cria alerta para o funcionário
      await notificationService.criarAlerta(
        originalRecord.user_id,
        'ajuste_ponto',
        'info',
        'Seu ponto foi ajustado',
        `Registro ajustado por gestor. Motivo: `,
        { adjustmentId: adjustment.id }
      );

      logger.success('Ajuste criado com sucesso', { adjustmentId: adjustment.id });

      return adjustment;

    } catch (error) {
      logger.error('Erro ao criar ajuste', { error: error.message });
      throw error;
    }
  }

  async getAdjustmentsByUser(userId) {
    try {
      const result = await db.query(`
        SELECT ta.*, 
               u.nome as adjusted_by_name,
               tr.timestamp as current_timestamp,
               tr.record_type as current_type
        FROM time_adjustments ta
        JOIN users u ON ta.adjusted_by = u.id
        JOIN time_records tr ON ta.time_record_id = tr.id
        WHERE ta.user_id = $1
        ORDER BY ta.adjusted_at DESC
      `, [userId]);

      return result.rows;

    } catch (error) {
      logger.error('Erro ao buscar ajustes do usuário', { error: error.message });
      throw error;
    }
  }

  async getAllAdjustments(filters = {}) {
    try {
      let query = `
        SELECT ta.*, 
               u.nome as user_name,
               u.matricula,
               adj.nome as adjusted_by_name
        FROM time_adjustments ta
        JOIN users u ON ta.user_id = u.id
        JOIN users adj ON ta.adjusted_by = adj.id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      if (filters.userId) {
        query += ` AND ta.user_id = $`;
        params.push(filters.userId);
        paramIndex++;
      }

      if (filters.startDate && filters.endDate) {
        query += ` AND DATE(ta.adjusted_at) BETWEEN $ AND $`;
        params.push(filters.startDate, filters.endDate);
        paramIndex += 2;
      }

      query += ` ORDER BY ta.adjusted_at DESC`;

      const result = await db.query(query, params);
      return result.rows;

    } catch (error) {
      logger.error('Erro ao buscar todos os ajustes', { error: error.message });
      throw error;
    }
  }
}

module.exports = new AdjustmentsService();
