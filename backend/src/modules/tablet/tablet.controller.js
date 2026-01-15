const db = require('../../config/database');
const logger = require('../../utils/logger');
const photoService = require('../../services/photoService');

class TabletController {

  // Buscar usuário por matrícula (SEM autenticação)
  async getByMatricula(req, res) {
    try {
      const { matricula } = req.params;

      const result = await db.query(`
        SELECT id, matricula, nome, cargo, status
        FROM users
        WHERE matricula = $1 AND status = 'ativo'
      `, [matricula]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Matrícula não encontrada ou usuário inativo'
        });
      }

      logger.info('Usuário encontrado para tablet', { matricula });

      res.json({
        success: true,
        data: result.rows[0]
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
      // VALIDAÇÃO DE INTERVALO MÍNIMO (1 HORA)
      // ============================================
      if (record_type === 'retorno_intervalo') {
        const validationDate = timestamp ? new Date(timestamp).toISOString().split('T')[0] : 'CURRENT_DATE';

        const lastIntervalExit = await db.query(`
          SELECT timestamp
          FROM time_records
          WHERE user_id = $1
            AND record_type = 'saida_intervalo'
            AND DATE(timestamp) = ${validationDate === 'CURRENT_DATE' ? 'CURRENT_DATE' : `'${validationDate}'`}
          ORDER BY timestamp DESC
          LIMIT 1
        `, [user.id]);

        if (lastIntervalExit.rows.length > 0) {
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
      }

      // ============================================
      // VALIDAÇÃO: NÃO PODE BATER ENTRADA 2X
      // ============================================
      if (record_type === 'entrada') {
        const validationDate = timestamp ? new Date(timestamp).toISOString().split('T')[0] : 'CURRENT_DATE';
        const jaTemEntrada = await db.query(`
          SELECT id
          FROM time_records
          WHERE user_id = $1
            AND record_type = 'entrada'
            AND DATE(timestamp) = ${validationDate === 'CURRENT_DATE' ? 'CURRENT_DATE' : `'${validationDate}'`}
          LIMIT 1
        `, [user.id]);

        if (jaTemEntrada.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Você já registrou entrada hoje. Selecione outro tipo de registro.'
          });
        }
      }

      // ============================================
      // VALIDAÇÃO: NÃO PODE BATER SAÍDA FINAL SEM ENTRADA
      // ============================================
      if (record_type === 'saida_final') {
        const validationDate = timestamp ? new Date(timestamp).toISOString().split('T')[0] : 'CURRENT_DATE';
        const temEntrada = await db.query(`
          SELECT id
          FROM time_records
          WHERE user_id = $1
            AND record_type = 'entrada'
            AND DATE(timestamp) = ${validationDate === 'CURRENT_DATE' ? 'CURRENT_DATE' : `'${validationDate}'`}
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

          // ← ADICIONE ESTE LOG:
          logger.info('📸 Foto processada', {
            photoLength: base64Data.length,
            preview: base64Data.substring(0, 50)
          });
        } catch (err) {
          logger.error('Erro ao processar foto', { error: err.message });
        }
      }

      // Inserir registro
      const result = await db.query(`
  INSERT INTO time_records (user_id, record_type, timestamp, photo_data, created_at)
  VALUES ($1, $2, COALESCE($3, NOW()), $4, NOW())
  RETURNING id, user_id, record_type, timestamp, photo_data
`, [user.id, record_type, timestamp, photoData]);

      logger.success('Ponto registrado via tablet', {
        matricula,
        user_id: user.id,
        record_type,
        record_id: result.rows[0].id
      });

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

  // Registrar ponto com user_id (MANTIDO PARA COMPATIBILIDADE)
  async registerRecord(req, res) {
    try {
      const { user_id, record_type } = req.body;
      const photo = req.file;

      if (!user_id || !record_type) {
        return res.status(400).json({
          success: false,
          error: 'user_id e record_type são obrigatórios'
        });
      }

      const validTypes = ['entrada', 'saida_intervalo', 'retorno_intervalo', 'saida_final'];
      if (!validTypes.includes(record_type)) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de registro inválido'
        });
      }

      const userCheck = await db.query(
        'SELECT id, nome, status FROM users WHERE id = $1',
        [user_id]
      );

      if (userCheck.rows.length === 0 || userCheck.rows[0].status !== 'ativo') {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado ou inativo'
        });
      }

      let photoData = null;
      if (photo) {
        photoData = await photoService.processAndSavePhoto(photo.buffer);
      }

      const result = await db.query(`
        INSERT INTO time_records (user_id, record_type, timestamp, photo_data, created_at)
        VALUES ($1, $2, NOW(), $3, NOW())
        RETURNING id, user_id, record_type, timestamp
      `, [user_id, record_type, photoData]);

      logger.success('Ponto registrado via tablet', {
        user_id,
        record_type,
        record_id: result.rows[0].id
      });

      res.status(201).json({
        success: true,
        message: 'Ponto registrado com sucesso',
        data: result.rows[0]
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
        SELECT 
          id, 
          matricula, 
          nome, 
          cargo, 
          status,
          user_type,
          is_duty_shift_only
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

      return res.json({
        success: true,
        data: {
          id: user.id,
          matricula: user.matricula,
          nome: user.nome,
          cargo: user.cargo,
          user_type: user.user_type,
          is_duty_shift_only: user.is_duty_shift_only,
          interface_type: user.is_duty_shift_only ? 'DUTY_SHIFT' : 'FULL_TIME'
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
}

module.exports = new TabletController();