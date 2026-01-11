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

  // Registrar ponto (SEM autenticação - valida matrícula internamente)
  async registerRecord(req, res) {
    try {
      const { user_id, record_type } = req.body;
      const photo = req.file;

      // Validar campos obrigatórios
      if (!user_id || !record_type) {
        return res.status(400).json({
          success: false,
          error: 'user_id e record_type são obrigatórios'
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

      // Verificar se usuário existe e está ativo
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

      // Processar foto (se houver)
      let photoData = null;
      if (photo) {
        photoData = await photoService.processAndSavePhoto(photo.buffer);
      }

      // Inserir registro
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
  // Registrar ponto com MATRÍCULA (em vez de user_id)
  async register(req, res) {
    try {
      const { matricula, record_type, photo } = req.body;

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

      // Processar foto base64 (se houver)
      let photoData = null;
      if (photo) {
        try {
          // Remove o prefixo data:image/...;base64,
          const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
          photoData = base64Data;
        } catch (err) {
          logger.error('Erro ao processar foto', { error: err.message });
        }
      }

      // Inserir registro
      const result = await db.query(`
        INSERT INTO time_records (user_id, record_type, timestamp, photo_data, created_at)
        VALUES ($1, $2, NOW(), $3, NOW())
        RETURNING id, user_id, record_type, timestamp
      `, [user.id, record_type, photoData]);

      logger.success('Ponto registrado via tablet', {
        matricula,
        user_id: user.id,
        record_type,
        record_id: result.rows[0].id
      });

      res.status(201).json({
        success: true,
        message: 'Ponto registrado com sucesso',
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
}



module.exports = new TabletController();