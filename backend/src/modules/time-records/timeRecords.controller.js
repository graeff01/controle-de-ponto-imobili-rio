const timeRecordsService = require('./timeRecords.service');
const validators = require('../../utils/validators');
const logger = require('../../utils/logger');
const db = require('../../config/database');
const dateHelper = require('../../utils/dateHelper');
const config = require('../../config/database'); // Reutilizando para queries rápidas

class TimeRecordsController {

  // ADICIONAR NO TOPO DA CLASSE TimeRecordsController

  async create(req, res, next) {
    try {
      const { user_id, record_type } = req.body;
      const tabletToken = req.headers['x-tablet-token'];
      const photo = req.file;

      // 1. Validar se o dispositivo é um Tablet Oficial
      let isOfficialTablet = false;
      if (tabletToken) {
        const deviceRes = await db.query(
          "SELECT device_type FROM authorized_devices WHERE token = $1",
          [tabletToken]
        );
        isOfficialTablet = deviceRes.rows[0]?.device_type === 'tablet';
      }

      // 2. Chamar Service para processar o registro completo
      const record = await timeRecordsService.createRecord(
        user_id,
        record_type,
        photo,
        req,
        isOfficialTablet
      );

      return res.status(201).json({
        success: true,
        data: record,
        message: 'Registro de ponto realizado com sucesso.'
      });

    } catch (error) {
      next(error);
    }
  }


  async createExternal(req, res, next) {
    try {
      const { record_type, latitude, longitude, reason } = req.body;
      const photo = req.file;
      const userId = req.userId;

      // 1. Verificar se o usuário é consultora (ou tem permissão)
      const userRes = await db.query('SELECT cargo FROM users WHERE id = $1', [userId]);
      const cargo = userRes.rows[0]?.cargo?.toLowerCase() || '';

      if (!cargo.includes('consultor')) {
        return res.status(403).json({
          error: 'Apenas consultoras podem realizar registro de ponto externo.'
        });
      }

      if (!latitude || !longitude || !reason) {
        return res.status(400).json({
          error: 'Localização (GPS) e justificativa são obrigatórios para ponto externo.'
        });
      }

      // 2. Criar solicitação de ajuste (Pendente)
      const timestamp = dateHelper.getNowInBR();

      const result = await db.query(`
        INSERT INTO time_adjustments 
        (user_id, adjusted_timestamp, adjusted_type, reason, adjusted_by, status, is_addition, latitude, longitude, photo_data)
        VALUES ($1, $2, $3, $4, $1, 'pending', true, $5, $6, $7)
        RETURNING id
      `, [
        userId,
        timestamp,
        record_type,
        `PONTO EXTERNO (APP): ${reason}`,
        latitude,
        longitude,
        photo ? photo.buffer.toString('base64') : null
      ]);

      // 3. Notificar Gestor
      try {
        const alertsService = require('../alerts/alerts.service');
        const userNameRes = await db.query('SELECT nome FROM users WHERE id = $1', [userId]);
        const nome = userNameRes.rows[0]?.nome;

        await alertsService.createAlert({
          user_id: userId,
          alert_type: 'external_punch',
          title: 'Ponto Externo Pendente',
          message: `${nome} registrou um ponto externo via celular às ${dateHelper.formatTime(timestamp)}. Requer aprovação.`,
          severity: 'info',
          related_id: result.rows[0].id
        });
      } catch (err) {
        logger.error('Erro ao alertar ponto externo', { error: err.message });
      }

      res.status(201).json({
        success: true,
        message: 'Registro externo enviado para aprovação do gestor.',
        data: result.rows[0]
      });

    } catch (error) {
      next(error);
    }
  }



  async createManual(req, res, next) {
    try {
      const { user_id, record_type, timestamp, reason } = req.body;

      if (!user_id || !record_type || !timestamp || !reason) {
        return res.status(400).json({
          error: 'Todos os campos são obrigatórios: user_id, record_type, timestamp, reason'
        });
      }

      if (reason.length < 10) {
        return res.status(400).json({
          error: 'Justificativa deve ter no mínimo 10 caracteres'
        });
      }

      // Verificar se o mês está fechado
      const tsDate = new Date(timestamp);
      const closedCheck = await db.query(
        'SELECT id FROM monthly_closings WHERE year = $1 AND month = $2',
        [tsDate.getFullYear(), tsDate.getMonth() + 1]
      );
      if (closedCheck.rows.length > 0) {
        return res.status(400).json({
          error: 'Este mês já foi fechado. Não é possível criar registros manuais.'
        });
      }

      const record = await timeRecordsService.createManualRecord(
        user_id,
        record_type,
        new Date(timestamp),
        reason,
        req.userId,
        req
      );

      return res.status(201).json({
        success: true,
        data: record,
        message: 'Registro manual criado com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }

  async getUserRecords(req, res, next) {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate e endDate são obrigatórios'
        });
      }

      const records = await timeRecordsService.getUserRecords(
        userId,
        new Date(startDate),
        new Date(endDate)
      );

      return res.json({
        success: true,
        data: records
      });

    } catch (error) {
      next(error);
    }
  }

  async getMyRecords(req, res, next) {
    try {
      const userId = req.userId;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate e endDate são obrigatórios'
        });
      }

      const records = await timeRecordsService.getUserRecords(
        userId,
        new Date(startDate),
        new Date(endDate)
      );

      return res.json({
        success: true,
        data: records
      });

    } catch (error) {
      next(error);
    }
  }

  async getByDate(req, res, next) {
    try {
      const { date } = req.params;

      const records = await timeRecordsService.getRecordsByDate(new Date(date));

      return res.json({
        success: true,
        data: records
      });

    } catch (error) {
      next(error);
    }
  }

  async getTodayRecords(req, res) {
    try {
      const response = await timeRecordsService.getTodayRecords();

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ NOVO: Buscar todos os registros (CLT + Plantonistas)
  async getAllRecords(req, res) {
    try {
      // Buscar registros CLT
      const cltResult = await db.query(`
      SELECT
        tr.id,
        tr.user_id,
        tr.record_type,
        tr.timestamp,
        tr.photo_data,
        u.nome,
        u.matricula,
        u.cargo,
        u.departamento,
        'clt' as user_category
      FROM time_records tr
      JOIN users u ON tr.user_id = u.id
      WHERE DATE(tr.timestamp) >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY tr.timestamp DESC
    `);

      // Converter buffer de foto para base64 (ignora fotos inválidas < 100 bytes)
      const cltRecords = { rows: cltResult.rows.map(row => {
        if (row.photo_data && Buffer.isBuffer(row.photo_data)) {
          return { ...row, photo_data: row.photo_data.length >= 100 ? row.photo_data.toString('base64') : null };
        }
        return row;
      })};

      // Buscar registros de Plantonistas
      const brokerRecords = await db.query(`
      SELECT 
        ds.id,
        ds.user_id,
        'presenca' as record_type,
        ds.date::timestamp + ds.check_in_time::time as timestamp,
        u.nome,
        u.matricula,
        u.cargo,
        u.departamento,
        'plantonista' as user_category
      FROM duty_shifts ds
      JOIN users u ON ds.user_id = u.id
      WHERE ds.date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY ds.date DESC, ds.check_in_time DESC
    `);

      res.json({
        success: true,
        data: {
          clt: cltRecords.rows,
          plantonistas: brokerRecords.rows
        }
      });

    } catch (error) {
      logger.error('Erro ao buscar registros', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  async getDailyJourney(req, res, next) {
    try {
      const { userId, date } = req.params;

      const journey = await timeRecordsService.getDailyJourney(userId, new Date(date));

      if (!journey) {
        return res.json({
          success: true,
          data: null,
          message: 'Nenhum registro encontrado para esta data'
        });
      }

      return res.json({
        success: true,
        data: journey
      });

    } catch (error) {
      next(error);
    }
  }

  async getMyDailyJourney(req, res, next) {
    try {
      const userId = req.userId;
      const { date } = req.params;

      const journey = await timeRecordsService.getDailyJourney(userId, new Date(date));

      return res.json({
        success: true,
        data: journey
      });

    } catch (error) {
      next(error);
    }
  }

  async getMonthlyJourney(req, res, next) {
    try {
      const { userId, year, month } = req.params;

      const journey = await timeRecordsService.getMonthlyJourney(
        userId,
        parseInt(year),
        parseInt(month)
      );

      return res.json({
        success: true,
        data: journey
      });

    } catch (error) {
      next(error);
    }
  }

  async getMyMonthlyJourney(req, res, next) {
    try {
      const userId = req.userId;
      const { year, month } = req.params;

      const journey = await timeRecordsService.getMonthlyJourney(
        userId,
        parseInt(year),
        parseInt(month)
      );

      return res.json({
        success: true,
        data: journey
      });

    } catch (error) {
      next(error);
    }
  }

  async getRecordPhoto(req, res, next) {
    try {
      const { recordId } = req.params;

      const photoBuffer = await timeRecordsService.getRecordPhoto(recordId);

      if (!photoBuffer) {
        return res.status(404).send('Foto não encontrada');
      }

      res.setHeader('Content-Type', 'image/jpeg');
      res.send(photoBuffer);

    } catch (error) {
      next(error);
    }
  }


  async checkInconsistencies(req, res, next) {
    try {
      const { userId, date } = req.params;

      const result = await timeRecordsService.checkInconsistencies(
        userId,
        new Date(date)
      );

      return res.json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req, res, next) {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate e endDate são obrigatórios'
        });
      }

      const stats = await timeRecordsService.getStatistics(
        userId,
        new Date(startDate),
        new Date(endDate)
      );

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TimeRecordsController();
