const db = require('../../config/database');
const logger = require('../../utils/logger');
const auditService = require('../../services/auditService');
const alertsService = require('../alerts/alerts.service');
const timeRecordsService = require('../time-records/timeRecords.service');

class AdjustmentsService {

  async createAdjustment(data, adjustedBy, req) {
    try {
      const { time_record_id, adjusted_timestamp, adjusted_type, reason, autoApprove = false } = data;

      // Busca registro original
      const recordResult = await db.query(`
        SELECT * FROM time_records WHERE id = $1
      `, [time_record_id]);

      if (recordResult.rows.length === 0) {
        throw new Error('Registro de ponto não encontrado');
      }

      const originalRecord = recordResult.rows[0];
      const status = autoApprove ? 'approved' : 'pending';
      const approvedBy = autoApprove ? adjustedBy : null;
      const approvedAt = autoApprove ? new Date() : null;

      // Cria ajuste
      const result = await db.query(`
        INSERT INTO time_adjustments 
        (time_record_id, user_id, original_timestamp, original_type, 
         adjusted_timestamp, adjusted_type, reason, adjusted_by, status, approved_by, approved_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        time_record_id,
        originalRecord.user_id,
        originalRecord.timestamp,
        originalRecord.record_type,
        adjusted_timestamp,
        adjusted_type,
        reason,
        adjustedBy,
        status,
        approvedBy,
        approvedAt
      ]);

      const adjustment = result.rows[0];

      // Se aprovado automaticamente, aplica a mudança
      if (status === 'approved') {
        await this.applyAdjustmentToRecord(adjustment);
      } else {
        // Notifica administradores sobre novo ajuste pendente
        // TODO: Implementar notificação para grupo de admins
      }

      // Log de auditoria
      await auditService.log(
        'adjustment_created',
        adjustedBy,
        originalRecord.user_id,
        `Solicitação de ajuste de ponto (${status})`,
        {
          adjustmentId: adjustment.id,
          reason,
          status
        },
        req
      );

      logger.success('Solicitação de ajuste criada', { adjustmentId: adjustment.id, status });

      return adjustment;

    } catch (error) {
      logger.error('Erro ao criar ajuste', { error: error.message });
      throw error;
    }
  }

  // ✅ NOVO: Aprovar ajuste
  async approveAdjustment(adjustmentId, approvedBy, req) {
    try {
      const result = await db.query(`
        UPDATE time_adjustments 
        SET status = 'approved', approved_by = $1, approved_at = NOW()
        WHERE id = $2 AND status = 'pending'
        RETURNING *
      `, [approvedBy, adjustmentId]);

      if (result.rows.length === 0) {
        throw new Error('Ajuste não encontrado ou já processado');
      }

      const adjustment = result.rows[0];

      // Aplica a mudança no registro oficial
      await this.applyAdjustmentToRecord(adjustment);

      // Log e Notificação
      await auditService.log(
        'adjustment_approved',
        approvedBy,
        adjustment.user_id,
        'Ajuste de ponto aprovado',
        { adjustmentId },
        req
      );

      await alertsService.createAlert({
        user_id: adjustment.user_id,
        alert_type: 'ajuste_aprovado',
        severity: 'success',
        title: 'Seu ajuste de ponto foi APROVADO',
        message: `O ajuste solicitado foi aprovado e aplicado.`,
        related_id: adjustmentId
      });

      return adjustment;

    } catch (error) {
      logger.error('Erro ao aprovar ajuste', { error: error.message });
      throw error;
    }
  }

  // ✅ NOVO: Rejeitar ajuste
  async rejectAdjustment(adjustmentId, rejectedBy, reason, req) {
    try {
      const result = await db.query(`
        UPDATE time_adjustments 
        SET status = 'rejected', approved_by = $1, rejection_reason = $2, approved_at = NOW()
        WHERE id = $3 AND status = 'pending'
        RETURNING *
      `, [rejectedBy, reason, adjustmentId]);

      if (result.rows.length === 0) {
        throw new Error('Ajuste não encontrado ou já processado');
      }

      const adjustment = result.rows[0];

      // Log e Notificação
      await auditService.log(
        'adjustment_rejected',
        rejectedBy,
        adjustment.user_id,
        'Ajuste de ponto rejeitado',
        { adjustmentId, reason },
        req
      );

      await alertsService.createAlert({
        user_id: adjustment.user_id,
        alert_type: 'ajuste_rejeitado',
        severity: 'error',
        title: 'Seu ajuste de ponto foi REJEITADO',
        message: `Motivo: ${reason}`,
        related_id: adjustmentId
      });

      return adjustment;

    } catch (error) {
      logger.error('Erro ao rejeitar ajuste', { error: error.message });
      throw error;
    }
  }

  // Auxiliar para aplicar mudança
  async applyAdjustmentToRecord(adjustment) {
    try {
      if (adjustment.is_addition || !adjustment.time_record_id) {
        // Inserir NOVO registro
        // Se tem GPS (latitude/longitude), é um registro externo de consultora
        const isExternalPunch = adjustment.latitude && adjustment.longitude;

        logger.info('Aplicando ajuste aprovado', {
          adjustment_id: adjustment.id,
          user_id: adjustment.user_id,
          is_external: isExternalPunch,
          record_type: adjustment.adjusted_type
        });

        if (isExternalPunch) {
          // Registro externo: incluir GPS, foto e motivo
          await db.query(`
            INSERT INTO time_records
            (user_id, timestamp, record_type, latitude, longitude, photo_data, manual_reason, is_manual, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
          `, [
            adjustment.user_id,
            adjustment.adjusted_timestamp,
            adjustment.adjusted_type,
            adjustment.latitude,
            adjustment.longitude,
            adjustment.photo_data,
            adjustment.reason
          ]);

          logger.info('✅ Registro externo aprovado e inserido em time_records', {
            user_id: adjustment.user_id,
            has_gps: true,
            has_photo: !!adjustment.photo_data
          });
        } else {
          // Registro normal: sem GPS
          await db.query(`
            INSERT INTO time_records (user_id, timestamp, record_type, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
          `, [adjustment.user_id, adjustment.adjusted_timestamp, adjustment.adjusted_type]);

          logger.info('✅ Registro normal aprovado e inserido em time_records', {
            user_id: adjustment.user_id
          });
        }
      } else {
        // Atualizar registro EXISTENTE
        await db.query(`
          UPDATE time_records
          SET timestamp = $1, record_type = $2, updated_at = NOW()
          WHERE id = $3
        `, [adjustment.adjusted_timestamp, adjustment.adjusted_type, adjustment.time_record_id]);

        logger.info('✅ Registro existente atualizado', {
          record_id: adjustment.time_record_id
        });
      }

      // Recalcular banco de horas para o dia do ajuste
      try {
        const adjustmentDate = new Date(adjustment.adjusted_timestamp);
        await timeRecordsService.atualizarBancoHoras(adjustment.user_id, adjustmentDate);
        logger.info('✅ Banco de horas atualizado', { user_id: adjustment.user_id });
      } catch (bhError) {
        logger.error('Erro ao atualizar banco de horas (não crítico)', {
          error: bhError.message,
          user_id: adjustment.user_id
        });
        // Não falha a aprovação se banco de horas falhar
      }
    } catch (error) {
      logger.error('Erro ao aplicar ajuste aprovado', {
        error: error.message,
        stack: error.stack,
        adjustment_id: adjustment.id
      });
      throw error;
    }
  }

  async getAdjustmentsByUser(userId) {
    try {
      const result = await db.query(`
        SELECT ta.*, 
               u.nome as adjusted_by_name,
               app.nome as approved_by_name, -- Novo
               tr.timestamp as current_timestamp,
               tr.record_type as current_type
        FROM time_adjustments ta
        JOIN users u ON ta.adjusted_by = u.id
        LEFT JOIN users app ON ta.approved_by = app.id
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
               adj.nome as adjusted_by_name,
               app.nome as approved_by_name,
               tr.timestamp as original_timestamp,
               tr.record_type as original_type
        FROM time_adjustments ta
        JOIN users u ON ta.user_id = u.id
        LEFT JOIN users adj ON ta.adjusted_by = adj.id
        LEFT JOIN users app ON ta.approved_by = app.id
        LEFT JOIN time_records tr ON ta.time_record_id = tr.id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      if (filters.userId) {
        query += ` AND ta.user_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }

      if (filters.status) {
        query += ` AND ta.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.startDate && filters.endDate) {
        query += ` AND DATE(ta.adjusted_at) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
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
