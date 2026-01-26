const db = require('../../config/database');
const logger = require('../../utils/logger');
const photoService = require('../../services/photoService');
const timeRecordsController = require('../time-records/timeRecords.controller');

class TabletController {

  // Validar token de dispositivo (usado no setup inicial)
  async validateDevice(req, res) {
    try {
      const { token } = req.params;

      const result = await db.query(
        "SELECT name, device_type FROM authorized_devices WHERE token = $1",
        [token]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Código de autorização inválido ou expirado.'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Erro ao validar dispositivo', { error: error.message });
      res.status(500).json({ error: 'Erro interno ao validar' });
    }
  }

  // Buscar usuário por matrícula (SEM autenticação)
  async getByMatricula(req, res) {
    try {
      const { matricula } = req.params;

      const result = await db.query(`
        SELECT id, matricula, nome, cargo, status
        FROM users
        WHERE matricula = $1 AND status = 'ativo'
      `, [matricula]);

      const user = result.rows[0];

      // --- VERIFICAR PONTOS ESQUECIDOS (INCONSISTÊNCIAS) ---
      // Busca o último registro de dias anteriores que não teve uma saída correspondente
      const inconsistencia = await db.query(`
        SELECT id, timestamp, record_type 
        FROM time_records 
        WHERE user_id = $1 
        AND DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') < CURRENT_DATE
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [user.id]);

      let pendingInconsistency = null;
      if (inconsistencia.rows.length > 0) {
        const last = inconsistencia.rows[0];
        // Se o último registro não foi uma 'saida_final', temos um problema
        if (last.record_type !== 'saida_final') {
          pendingInconsistency = {
            id: last.id,
            date: last.timestamp,
            type: last.record_type
          };
        }
      }

      logger.info('Usuário encontrado para tablet', { matricula, hasInconsistency: !!pendingInconsistency });

      res.json({
        success: true,
        data: {
          ...user,
          pendingInconsistency
        }
      });

    } catch (error) {
      logger.error('Erro ao buscar usuário por matrícula', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar usuário'
      });
    }
  }

  // Registrar ponto com MATRÍCULA (VERSÃO COMPLETA COM VALIDAÇÕES)
  async register(req, res) {
    try {
      const { matricula, record_type, photo, timestamp } = req.body;

      // Validar campos obrigatórios
      if (!matricula || !record_type) {
        return res.status(400).json({
          success: false,
          error: 'Matrícula e tipo de registro são obrigatórios'
        });
      }

      // Validar tipo de registro
      const validTypes = ['entrada', 'saida_intervalo', 'retorno_intervalo', 'saida_final'];
      if (!validTypes.includes(record_type)) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de registro inválido'
        });
      }

      // Buscar usuário pela matrícula
      const userResult = await db.query(
        'SELECT id, nome, status FROM users WHERE matricula = $1',
        [matricula]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Matrícula não encontrada'
        });
      }

      const user = userResult.rows[0];

      if (user.status !== 'ativo') {
        return res.status(403).json({
          success: false,
          error: 'Usuário inativo'
        });
      }

      // ============================================
      // VALIDAÇÕES DE SEQUÊNCIA
      // ============================================
      const validationDate = timestamp ? new Date(timestamp).toISOString().split('T')[0] : 'CURRENT_DATE';
      const dateCondition = validationDate === 'CURRENT_DATE' ? 'CURRENT_DATE' : `'${validationDate}'`;

      if (record_type === 'retorno_intervalo') {
        const lastIntervalExit = await db.query(`
          SELECT timestamp FROM time_records
          WHERE user_id = $1 AND record_type = 'saida_intervalo'
            AND DATE(timestamp) = ${dateCondition}
          ORDER BY timestamp DESC LIMIT 1
        `, [user.id]);

        if (lastIntervalExit.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Você precisa registrar saída para intervalo antes de registrar o retorno.'
          });
        }

        const saidaIntervalo = new Date(lastIntervalExit.rows[0].timestamp);
        const agora = new Date();
        const diferencaMinutos = (agora - saidaIntervalo) / 1000 / 60;

        if (diferencaMinutos < 60) {
          const tempoRestante = Math.ceil(60 - diferencaMinutos);
          return res.status(400).json({
            success: false,
            error: `Intervalo mínimo é de 1 hora. Você ainda precisa aguardar ${tempoRestante} minuto(s).`,
            minutes_remaining: tempoRestante
          });
        }
      }

      if (record_type === 'saida_intervalo') {
        const temEntrada = await db.query(`
          SELECT id FROM time_records
          WHERE user_id = $1 AND record_type = 'entrada'
            AND DATE(timestamp) = ${dateCondition}
          LIMIT 1
        `, [user.id]);

        if (temEntrada.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Você precisa registrar entrada antes de registrar saída para intervalo.'
          });
        }
      }

      if (record_type === 'entrada') {
        const jaTemEntrada = await db.query(`
          SELECT id FROM time_records
          WHERE user_id = $1 AND record_type = 'entrada'
            AND DATE(timestamp) = ${dateCondition}
          LIMIT 1
        `, [user.id]);

        if (jaTemEntrada.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Você já registrou entrada hoje.'
          });
        }
      }

      if (record_type === 'saida_final') {
        const temEntrada = await db.query(`
          SELECT id FROM time_records
          WHERE user_id = $1 AND record_type = 'entrada'
            AND DATE(timestamp) = ${dateCondition}
          LIMIT 1
        `, [user.id]);

        if (temEntrada.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Você precisa registrar entrada antes de registrar saída final.'
          });
        }
      }

      // Processar foto base64 (se houver)
      let photoData = null;
      if (photo) {
        try {
          const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
          photoData = base64Data;
          logger.info('📸 Foto processada base64');
        } catch (err) {
          logger.error('Erro ao processar foto', { error: err.message });
        }
      }

      // Inserir registro
      const result = await db.query(`
        INSERT INTO time_records (user_id, record_type, timestamp, photo_data, created_at)
        VALUES ($1, $2, COALESCE($3, NOW()), $4, NOW())
        RETURNING id, user_id, record_type, timestamp
      `, [user.id, record_type, timestamp, photoData]);

      logger.success('Ponto registrado via tablet', {
        matricula,
        user_id: user.id,
        record_type,
        record_id: result.rows[0].id
      });

      // Recalcular banco de horas imediatamente
      try {
        await timeRecordsController.atualizarBancoHoras(user.id, result.rows[0].timestamp);
      } catch (bhError) {
        logger.error('Erro ao atualizar banco de horas (totem)', { error: bhError.message });
      }

      res.status(201).json({
        success: true,
        message: 'Ponto registrado com sucesso!',
        data: {
          id: result.rows[0].id,
          user_name: user.nome,
          record_type: record_type,
          timestamp: result.rows[0].timestamp
        }
      });

    } catch (error) {
      logger.error('Erro ao registrar ponto via tablet', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Erro ao registrar ponto'
      });
    }
  }


  // Verificar tipo de usuário (para mostrar interface correta)
  async checkUserType(req, res) {
    try {
      const { matricula } = req.params;

      const result = await db.query(`
        SELECT id, matricula, nome, cargo, status, user_type, is_duty_shift_only
        FROM users
        WHERE matricula = $1 AND status = 'ativo'
      `, [matricula]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Matrícula não encontrada ou usuário inativo'
        });
      }

      const user = result.rows[0];

      // --- VERIFICAR PONTOS ESQUECIDOS (INCONSISTÊNCIAS) ---
      const inconsistencia = await db.query(`
        SELECT id, timestamp, record_type 
        FROM time_records 
        WHERE user_id = $1 
        AND DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') < CURRENT_DATE
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [user.id]);

      let pendingInconsistency = null;
      if (inconsistencia.rows.length > 0) {
        const last = inconsistencia.rows[0];
        if (last.record_type !== 'saida_final') {
          pendingInconsistency = {
            id: last.id,
            date: last.timestamp,
            type: last.record_type
          };
        }
      }

      logger.info('Usuário encontrado para tablet', { matricula, hasInconsistency: !!pendingInconsistency });

      res.json({
        success: true,
        data: {
          ...user,
          interface_type: user.is_duty_shift_only ? 'DUTY_SHIFT' : 'FULL_TIME',
          pendingInconsistency
        }
      });

    } catch (error) {
      logger.error('Erro ao verificar tipo de usuário', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Erro ao verificar usuário'
      });
    }
  }
  // ✅ NOVO: Solicitar Ajuste de Ponto Esquecido via Totem
  async requestAdjustment(req, res) {
    try {
      const { user_id, record_id, adjusted_time, reason } = req.body;

      if (!user_id || !record_id || !adjusted_time || !reason) {
        return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios.' });
      }

      // 1. Busca o registro original
      const recordResult = await db.query('SELECT * FROM time_records WHERE id = $1', [record_id]);
      if (recordResult.rows.length === 0) return res.status(404).json({ error: 'Registro não encontrado' });
      const original = recordResult.rows[0];

      // 2. Cria a data ajustada (mesmo dia do registro original, mas com a hora informada)
      const datePart = new Date(original.timestamp).toISOString().split('T')[0];
      const adjustedTimestamp = `${datePart}T${adjusted_time}:00`;

      // 3. Insere na tabela de ajustes como PENDENTE (e marca como ADIÇÃO)
      const result = await db.query(`
        INSERT INTO time_adjustments 
        (time_record_id, user_id, original_timestamp, original_type, 
         adjusted_timestamp, adjusted_type, reason, adjusted_by, status, is_addition)
        VALUES ($1, $2, $3, $4, $5, 'saida_final', $6, $2, 'pending', true)
        RETURNING id
      `, [record_id, user_id, original.timestamp, original.record_type, adjustedTimestamp, reason]);

      // 4. Criar Alerta para o Gestor
      try {
        const alertsService = require('../alerts/alerts.service');
        const userRes = await db.query('SELECT nome FROM users WHERE id = $1', [user_id]);
        const userName = userRes.rows[0]?.nome || 'Funcionário';

        await alertsService.createAlert({
          user_id: user_id,
          alert_type: 'adjustment_request',
          title: 'Solicitação de Ajuste (Totem)',
          message: `${userName} solicitou ajuste de ponto esquecido para o dia ${datePart}.`,
          severity: 'warning',
          related_id: result.rows[0].id
        });
      } catch (alertError) {
        logger.error('Erro ao criar alerta de ajuste', { error: alertError.message });
      }

      logger.success('Solicitação de ajuste enviada pelo Totem', { userId: user_id, adjustmentId: result.rows[0].id });

      res.json({
        success: true,
        message: 'Sua solicitação foi enviada ao RH para aprovação.'
      });

    } catch (error) {
      logger.error('Erro ao solicitar ajuste via totem', { error: error.message });
      res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
  }
}

module.exports = new TabletController();
