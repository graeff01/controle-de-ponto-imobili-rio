const db = require('../../config/database');
const logger = require('../../utils/logger');
const photoService = require('../../services/photoService');
const timeRecordsService = require('../time-records/timeRecords.service');

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
        SELECT id, matricula, nome, cargo, status, user_type, is_duty_shift_only, terms_accepted_at
        FROM users
        WHERE matricula = $1 AND status = 'ativo'
      `, [matricula]);

      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Matrícula não encontrada ou usuário inativo'
        });
      }

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
      // VALIDAÇÕES DE SEQUÊNCIA (parametrizadas)
      // ============================================
      const validationDate = timestamp ? new Date(timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      if (record_type === 'retorno_intervalo') {
        const lastIntervalExit = await db.query(`
          SELECT timestamp FROM time_records
          WHERE user_id = $1 AND record_type = 'saida_intervalo'
            AND DATE(timestamp) = $2
          ORDER BY timestamp DESC LIMIT 1
        `, [user.id, validationDate]);

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
            AND DATE(timestamp) = $2
          LIMIT 1
        `, [user.id, validationDate]);

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
            AND DATE(timestamp) = $2
          LIMIT 1
        `, [user.id, validationDate]);

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
            AND DATE(timestamp) = $2
          LIMIT 1
        `, [user.id, validationDate]);

        if (temEntrada.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Você precisa registrar entrada antes de registrar saída final.'
          });
        }

        // Se saiu pro intervalo mas não voltou, não pode bater saída final
        const saiuIntervalo = await db.query(`
          SELECT id FROM time_records
          WHERE user_id = $1 AND record_type = 'saida_intervalo'
            AND DATE(timestamp) = $2
          LIMIT 1
        `, [user.id, validationDate]);

        if (saiuIntervalo.rows.length > 0) {
          const voltouIntervalo = await db.query(`
            SELECT id FROM time_records
            WHERE user_id = $1 AND record_type = 'retorno_intervalo'
              AND DATE(timestamp) = $2
            LIMIT 1
          `, [user.id, validationDate]);

          if (voltouIntervalo.rows.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'Você saiu para intervalo mas ainda não registrou retorno. Registre o retorno primeiro.'
            });
          }
        }
      }

      // Processar foto base64 (se houver)
      let photoData = null;
      if (photo && photo.length > 100) {
        try {
          const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
          if (base64Data.length > 100) {
            photoData = Buffer.from(base64Data, 'base64');
            logger.info('Foto processada para buffer binário', { size: photoData.length });
          }
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
        await timeRecordsService.atualizarBancoHoras(user.id, result.rows[0].timestamp);
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

  // ✅ NOVO: Registrar Ponto Externo via Celular Autorizado (Consultoras)
  // VAI PARA APROVAÇÃO PENDENTE - NÃO REGISTRA DIRETO
  async externalRegister(req, res, next) {
    try {
      const { record_type, latitude, longitude, reason, user_id } = req.body;
      const photo = req.file;

      logger.info('📍 Registro externo iniciado (pendente aprovação)', { user_id, record_type, latitude, longitude });

      // VALIDAÇÃO: Campos obrigatórios
      if (!record_type || !latitude || !longitude || !user_id) {
        return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes.' });
      }

      // VALIDAÇÃO: Justificativa obrigatória
      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({
          success: false,
          error: 'Justificativa obrigatória (mínimo 5 caracteres)'
        });
      }

      // 1. Buscar usuário
      const userRes = await db.query('SELECT id, nome, cargo, status FROM users WHERE id = $1', [user_id]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      const user = userRes.rows[0];

      if (user.status !== 'ativo') {
        return res.status(403).json({ error: 'Usuário inativo' });
      }

      // ============================================
      // VALIDAÇÕES DE SEQUÊNCIA (mesmas do registro normal)
      // ============================================
      const hoje = new Date().toISOString().split('T')[0];

      // Buscar registros existentes hoje (aprovados + pendentes)
      const registrosHoje = await db.query(`
        SELECT adjusted_type as record_type, status
        FROM time_adjustments
        WHERE user_id = $1
        AND DATE(adjusted_timestamp) = $2
        AND is_addition = true
        ORDER BY adjusted_timestamp
      `, [user.id, hoje]);

      const registrosAprovados = registrosHoje.rows.filter(r => r.status === 'approved');
      const registrosPendentes = registrosHoje.rows.filter(r => r.status === 'pending');

      // Verificar se já tem registro pendente do mesmo tipo
      const pendenteMesmoTipo = registrosPendentes.find(r => r.record_type === record_type);
      if (pendenteMesmoTipo) {
        return res.status(400).json({
          success: false,
          error: `Você já tem um registro de ${record_type} pendente de aprovação hoje.`
        });
      }

      // VALIDAÇÃO: Não pode registrar entrada duas vezes
      if (record_type === 'entrada') {
        const jaTemEntrada = [...registrosAprovados, ...registrosPendentes].find(r => r.record_type === 'entrada');
        if (jaTemEntrada) {
          return res.status(400).json({
            success: false,
            error: 'Você já registrou entrada hoje.'
          });
        }
      }

      // VALIDAÇÃO: Para registrar saída, precisa ter entrada
      if (record_type === 'saida_final') {
        const temEntrada = [...registrosAprovados, ...registrosPendentes].find(r => r.record_type === 'entrada');
        if (!temEntrada) {
          return res.status(400).json({
            success: false,
            error: 'Você precisa registrar entrada antes de registrar saída.'
          });
        }
      }

      // 2. Processar Foto (armazenar como buffer binário)
      let photoData = null;
      if (photo) {
        try {
          if (photo.buffer && photo.buffer.length > 100) {
            photoData = photo.buffer;
            logger.info('Foto processada para buffer binário', { size: photoData.length });
          } else if (typeof photo === 'string' && photo.length > 100) {
            const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
            photoData = Buffer.from(base64Data, 'base64');
          }
        } catch (err) {
          logger.error('Erro ao processar foto', { error: err.message });
        }
      }

      // 3. Inserir em time_adjustments como PENDENTE DE APROVAÇÃO
      // NÃO vai direto para time_records - precisa de aprovação do gestor/admin
      const result = await db.query(`
        INSERT INTO time_adjustments
        (user_id, adjusted_timestamp, adjusted_type, reason, latitude, longitude, photo_data, status, is_addition)
        VALUES ($1, NOW(), $2, $3, $4, $5, $6, 'pending', true)
        RETURNING id, user_id, adjusted_type, adjusted_timestamp
      `, [user.id, record_type, reason, latitude, longitude, photoData]);

      logger.success('✅ Registro externo enviado para aprovação', {
        user_id: user.id,
        adjustment_id: result.rows[0].id,
        record_type,
        has_gps: true,
        has_photo: !!photoData
      });

      // 4. Criar Alerta para Gestor/Admin aprovar
      try {
        const alertsService = require('../alerts/alerts.service');
        await alertsService.createAlert({
          user_id: user.id,
          alert_type: 'external_punch_pending',
          title: '🔔 Registro Externo Aguardando Aprovação',
          message: `${user.nome} registrou ${record_type} externa e aguarda aprovação. Local: ${parseFloat(latitude).toFixed(6)},${parseFloat(longitude).toFixed(6)}. Motivo: ${reason}`,
          severity: 'warning',
          related_id: result.rows[0].id
        });
      } catch (err) {
        logger.error('Erro ao criar alerta de aprovação pendente', { error: err.message });
      }

      res.status(201).json({
        success: true,
        message: 'Registro enviado para aprovação do gestor! Você será notificado quando for aprovado.',
        data: {
          id: result.rows[0].id,
          user_id: result.rows[0].user_id,
          record_type: result.rows[0].adjusted_type,
          timestamp: result.rows[0].adjusted_timestamp,
          status: 'pending'
        }
      });

    } catch (error) {
      logger.error('Erro no registro externo via tablet/mobile', error);
      res.status(500).json({ success: false, error: 'Erro ao processar registro de visita.' });
    }
  }
}

module.exports = new TabletController();
