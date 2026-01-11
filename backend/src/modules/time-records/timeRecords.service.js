const db = require('../../config/database');
const logger = require('../../utils/logger');
const auditService = require('../../services/auditService');
const photoService = require('../../services/photoService');
const notificationService = require('../../services/notificationService');
const dateHelper = require('../../utils/dateHelper');

class TimeRecordsService {

  async createRecord(userId, recordType, photoFile, req) {
    try {
      // Valida sequência de registros
      await this.validateRecordSequence(userId, recordType);

      // Processa foto
      let photoData = null;
      let photoCapturedAt = null;

      if (photoFile) {
        const photo = await photoService.savePhoto(photoFile);
        photoData = photo.data;
        photoCapturedAt = new Date();
      }

      // Timestamp do servidor (NUNCA confiar no cliente)
      const timestamp = new Date();

      // Contexto de segurança
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');
      const deviceInfo = {
        platform: req.get('sec-ch-ua-platform'),
        mobile: req.get('sec-ch-ua-mobile')
      };

      // Insere registro
      const result = await db.query(`
        INSERT INTO time_records 
        (user_id, record_type, timestamp, photo_data, photo_captured_at, 
         ip_address, user_agent, device_info, is_manual, registered_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $1)
        RETURNING *
      `, [userId, recordType, timestamp, photoData, photoCapturedAt, 
           ipAddress, userAgent, JSON.stringify(deviceInfo)]);

      const record = result.rows[0];

      // Log de auditoria
      await auditService.log(
        'time_record_created',
        userId,
        null,
        `Registro de ponto: `,
        { recordType, timestamp },
        req
      );

      logger.success('Registro de ponto criado', { 
        userId, 
        recordType, 
        timestamp: dateHelper.formatDateTimeBR(timestamp) 
      });

      // Remove foto do retorno (muito grande para JSON)
      delete record.photo_data;

      return record;

    } catch (error) {
      logger.error('Erro ao criar registro de ponto', { error: error.message });
      throw error;
    }
  }

  async validateRecordSequence(userId, recordType) {
    try {
      // Busca último registro do dia
      const result = await db.query(`
        SELECT record_type 
        FROM time_records 
        WHERE user_id = $1 
        AND DATE(timestamp) = CURRENT_DATE
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [userId]);

      const lastRecord = result.rows[0]?.record_type;

      // Validações de sequência
      const validSequences = {
        'entrada': [null], // Só pode ser o primeiro
        'saida_intervalo': ['entrada'],
        'retorno_intervalo': ['saida_intervalo'],
        'saida_final': ['retorno_intervalo']
      };

      if (!validSequences[recordType].includes(lastRecord)) {
        const messages = {
          'entrada': 'Você já registrou entrada hoje',
          'saida_intervalo': 'Você precisa registrar entrada antes de sair para intervalo',
          'retorno_intervalo': 'Você precisa sair para intervalo antes de retornar',
          'saida_final': 'Você precisa retornar do intervalo antes da saída final'
        };

        throw new Error(messages[recordType] || 'Sequência de registro inválida');
      }

      return true;

    } catch (error) {
      logger.error('Erro na validação de sequência', { error: error.message });
      throw error;
    }
  }

  async createManualRecord(userId, recordType, timestamp, reason, registeredBy, req) {
    try {
      // Insere registro manual
      const result = await db.query(`
        INSERT INTO time_records 
        (user_id, record_type, timestamp, is_manual, manual_reason, registered_by, 
         ip_address, user_agent)
        VALUES ($1, $2, $3, true, $4, $5, $6, $7)
        RETURNING *
      `, [userId, recordType, timestamp, reason, registeredBy, req.ip, req.get('user-agent')]);

      const record = result.rows[0];

      // Log de auditoria
      await auditService.log(
        'manual_time_record_created',
        registeredBy,
        userId,
        `Registro manual de ponto: `,
        { recordType, timestamp, reason },
        req
      );

      // Cria alerta
      await notificationService.criarAlerta(
        userId,
        'registro_manual',
        'info',
        'Registro de ponto manual',
        `Gestor registrou ponto manualmente: `,
        { recordId: record.id, reason }
      );

      logger.success('Registro manual criado', { userId, recordType, registeredBy });

      return record;

    } catch (error) {
      logger.error('Erro ao criar registro manual', { error: error.message });
      throw error;
    }
  }

  async getUserRecords(userId, startDate, endDate) {
    try {
      const result = await db.query(`
        SELECT id, user_id, record_type, timestamp, 
               is_manual, manual_reason, 
               ip_address, created_at
        FROM time_records
        WHERE user_id = $1
        AND DATE(timestamp) BETWEEN $2 AND $3
        ORDER BY timestamp ASC
      `, [userId, startDate, endDate]);

      return result.rows;

    } catch (error) {
      logger.error('Erro ao buscar registros do usuário', { error: error.message });
      throw error;
    }
  }

async getRecordsByDate(date) {
  try {
    const result = await db.query(`
      SELECT 
        tr.id,
        tr.user_id,
        tr.record_type,
        tr.timestamp,
        ENCODE(tr.photo_data::bytea, 'base64') as photo_data,  -- ← CONVERTER AQUI
        tr.is_manual,
        tr.manual_reason,
        tr.ip_address,
        tr.created_at,
        u.nome,
        u.matricula,
        u.cargo
      FROM time_records tr
      JOIN users u ON tr.user_id = u.id
      WHERE DATE(tr.timestamp) = $1
      ORDER BY tr.timestamp ASC
    `, [date]);

    return result.rows;

  } catch (error) {
    logger.error('Erro ao buscar registros por data', { error: error.message });
    throw error;
  }
}

  async getTodayRecords() {
    try {
      return await this.getRecordsByDate(new Date());
    } catch (error) {
      throw error;
    }
  }

  async getDailyJourney(userId, date) {
    try {
      const result = await db.query(`
        SELECT * FROM daily_journey
        WHERE user_id = $1 AND date = $2
      `, [userId, date]);

      if (result.rows.length === 0) {
        return null;
      }

      const journey = result.rows[0];

      // Calcula horas trabalhadas
      if (journey.entrada && journey.saida_final) {
        const hoursResult = await db.query(`
          SELECT hours_worked, status FROM hours_worked_daily
          WHERE user_id = $1 AND date = $2
        `, [userId, date]);

        if (hoursResult.rows.length > 0) {
          journey.hours_worked = hoursResult.rows[0].hours_worked;
          journey.status = hoursResult.rows[0].status;
        }
      } else {
        journey.status = 'incompleto';
      }

      return journey;

    } catch (error) {
      logger.error('Erro ao buscar jornada diária', { error: error.message });
      throw error;
    }
  }

  async getMonthlyJourney(userId, year, month) {
    try {
      const result = await db.query(`
        SELECT 
          dj.*,
          hwd.hours_worked,
          hwd.status
        FROM daily_journey dj
        LEFT JOIN hours_worked_daily hwd ON dj.user_id = hwd.user_id AND dj.date = hwd.date
        WHERE dj.user_id = $1 
        AND EXTRACT(YEAR FROM dj.date) = $2
        AND EXTRACT(MONTH FROM dj.date) = $3
        ORDER BY dj.date ASC
      `, [userId, year, month]);

      return result.rows;

    } catch (error) {
      logger.error('Erro ao buscar jornada mensal', { error: error.message });
      throw error;
    }
  }

  async getRecordPhoto(recordId) {
    try {
      const result = await db.query(`
        SELECT photo_data FROM time_records WHERE id = $1
      `, [recordId]);

      if (result.rows.length === 0 || !result.rows[0].photo_data) {
        return null;
      }

      return result.rows[0].photo_data;

    } catch (error) {
      logger.error('Erro ao buscar foto do registro', { error: error.message });
      throw error;
    }
  }

  async checkInconsistencies(userId, date) {
    try {
      const journey = await this.getDailyJourney(userId, date);

      if (!journey) {
        return {
          hasIssues: true,
          issues: ['Nenhum registro de ponto neste dia']
        };
      }

      const issues = [];

      // Verifica jornada incompleta
      if (journey.entrada && !journey.saida_final) {
        issues.push('Jornada incompleta - falta saída final');
      }

      // Verifica intervalo irregular
      if (journey.saida_intervalo && journey.retorno_intervalo) {
        const intervaloMinutos = dateHelper.calculateHoursDiff(
          journey.saida_intervalo, 
          journey.retorno_intervalo
        ) * 60;

        if (intervaloMinutos < 60) {
          issues.push(`Intervalo muito curto ( minutos)`);
        }

        if (intervaloMinutos > 120) {
          issues.push(`Intervalo muito longo ( minutos)`);
        }
      }

      // Verifica excesso de horas
      if (journey.hours_worked && journey.hours_worked > 10) {
        issues.push(`Excesso de horas trabalhadas (h)`);
      }

      return {
        hasIssues: issues.length > 0,
        issues
      };

    } catch (error) {
      logger.error('Erro ao verificar inconsistências', { error: error.message });
      throw error;
    }
  }

  async getStatistics(userId, startDate, endDate) {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(DISTINCT DATE(timestamp)) as dias_com_registro,
          COUNT(*) FILTER (WHERE is_manual = true) as registros_manuais,
          COUNT(DISTINCT DATE(timestamp)) FILTER (
            WHERE DATE(timestamp) IN (
              SELECT date FROM hours_worked_daily 
              WHERE user_id = $1 AND status = 'completo'
            )
          ) as dias_completos
        FROM time_records
        WHERE user_id = $1
        AND DATE(timestamp) BETWEEN $2 AND $3
      `, [userId, startDate, endDate]);

      const stats = result.rows[0];

      // Calcula total de horas
      const hoursResult = await db.query(`
        SELECT COALESCE(SUM(hours_worked), 0) as total_hours
        FROM hours_worked_daily
        WHERE user_id = $1 AND date BETWEEN $2 AND $3
      `, [userId, startDate, endDate]);

      stats.total_hours = parseFloat(hoursResult.rows[0].total_hours);

      return stats;

    } catch (error) {
      logger.error('Erro ao calcular estatísticas', { error: error.message });
      throw error;
    }
  }
}

module.exports = new TimeRecordsService();
