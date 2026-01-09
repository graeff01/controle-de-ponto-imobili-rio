const timeRecordsService = require('./timeRecords.service');
const validators = require('../../utils/validators');
const logger = require('../../utils/logger');
const photoService = require('../../services/photoService');

class TimeRecordsController {

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
