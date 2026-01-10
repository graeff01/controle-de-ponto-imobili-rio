const timeRecordsService = require('./timeRecords.service');
const validators = require('../../utils/validators');
const logger = require('../../utils/logger');
const photoService = require('../../services/photoService');

class TimeRecordsController {

  // ADICIONAR NO TOPO DA CLASSE TimeRecordsController

async create(req, res, next) {
  try {
    const { user_id, record_type } = req.body;
    const photo = req.file;

    // Validar duplicados - NOVO!
    const ultimoRegistro = await db.query(`
      SELECT record_type, timestamp 
      FROM time_records 
      WHERE user_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [user_id]);

    if (ultimoRegistro.rows.length > 0) {
      const ultimo = ultimoRegistro.rows[0];
      const diff = (new Date() - new Date(ultimo.timestamp)) / 1000 / 60; // minutos

      // Não permitir mesmo tipo em menos de 5 minutos
      if (ultimo.record_type === record_type && diff < 5) {
        return res.status(400).json({
          success: false,
          error: `Você já registrou "${record_type}" há ${Math.floor(diff)} minuto(s)`
        });
      }
    }

    // Processar foto
    let photoData = null;
    if (photo) {
      photoData = photo.buffer;
    }

    // Inserir registro
    const result = await db.query(`
      INSERT INTO time_records (user_id, record_type, timestamp, photo_data, ip_address, user_agent)
      VALUES ($1, $2, NOW(), $3, $4, $5)
      RETURNING id, user_id, record_type, timestamp
    `, [user_id, record_type, photoData, req.ip, req.get('user-agent')]);

    // Atualizar banco de horas - NOVO!
    await this.atualizarBancoHoras(user_id, new Date());

    logger.success('Ponto registrado', { record_id: result.rows[0].id });

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
}

// ADICIONAR ESTA NOVA FUNÇÃO NA CLASSE
async atualizarBancoHoras(userId, date) {
  try {
    const dataFormatada = date.toISOString().split('T')[0];

    // Buscar horário esperado do usuário
    const userResult = await db.query(
      'SELECT expected_daily_hours FROM users WHERE id = $1',
      [userId]
    );

    const horasEsperadas = userResult.rows[0]?.expected_daily_hours || 8;

    // Calcular horas trabalhadas do dia
    const registros = await db.query(`
      SELECT record_type, timestamp 
      FROM time_records 
      WHERE user_id = $1 AND DATE(timestamp) = $2
      ORDER BY timestamp ASC
    `, [userId, dataFormatada]);

    let horasTrabalhadas = 0;

    if (registros.rows.length >= 2) {
      const entrada = registros.rows.find(r => r.record_type === 'entrada');
      const saidaFinal = registros.rows.find(r => r.record_type === 'saida_final');

      if (entrada && saidaFinal) {
        const diff = new Date(saidaFinal.timestamp) - new Date(entrada.timestamp);
        horasTrabalhadas = diff / 1000 / 60 / 60; // converter para horas

        // Descontar intervalo
        const saidaIntervalo = registros.rows.find(r => r.record_type === 'saida_intervalo');
        const retornoIntervalo = registros.rows.find(r => r.record_type === 'retorno_intervalo');

        if (saidaIntervalo && retornoIntervalo) {
          const intervalo = (new Date(retornoIntervalo.timestamp) - new Date(saidaIntervalo.timestamp)) / 1000 / 60 / 60;
          horasTrabalhadas -= intervalo;
        }
      }
    }

    // Inserir ou atualizar banco de horas
    await db.query(`
      INSERT INTO hours_bank (user_id, date, hours_worked, hours_expected)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, date) 
      DO UPDATE SET 
        hours_worked = $3,
        updated_at = NOW()
    `, [userId, dataFormatada, horasTrabalhadas.toFixed(2), horasEsperadas]);

  } catch (error) {
    logger.error('Erro ao atualizar banco de horas', { error: error.message });
  }
}

  async create(req, res, next) {
    try {
      const { user_id, record_type } = req.body;
      const photoFile = req.file;

      // Validação básica
      const { error } = validators.timeRecordSchema.validate({ user_id, record_type });
      if (error) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.details.map(d => d.message)
        });
      }

      // Verifica se a foto foi enviada
      if (!photoFile) {
        return res.status(400).json({
          error: 'Foto é obrigatória para registro de ponto'
        });
      }

      const record = await timeRecordsService.createRecord(
        user_id, 
        record_type, 
        photoFile, 
        req
      );

      return res.status(201).json({
        success: true,
        data: record,
        message: 'Ponto registrado com sucesso'
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

  async getTodayRecords(req, res, next) {
    try {
      const records = await timeRecordsService.getTodayRecords();

      return res.json({
        success: true,
        data: records
      });

    } catch (error) {
      next(error);
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

      const photoData = await timeRecordsService.getRecordPhoto(recordId);

      if (!photoData) {
        return res.status(404).json({
          error: 'Foto não encontrada'
        });
      }

      // Converte para base64
      const base64Photo = await photoService.getPhotoBase64(photoData);

      return res.json({
        success: true,
        data: {
          photo: base64Photo,
          contentType: 'image/jpeg'
        }
      });

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
