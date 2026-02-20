const db = require('../../config/database');
const logger = require('../../utils/logger');
const auditService = require('../../services/auditService');
const photoService = require('../../services/photoService');
const notificationService = require('../../services/notificationService');
const dateHelper = require('../../utils/dateHelper');

// Converte buffer de foto para base64, tratando formatos antigos e inválidos
function photoBufferToBase64(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return null;
  // Fotos inválidas/vazias (ex: "data:," armazenado como bytes) são < 100 bytes
  if (buffer.length < 100) return null;
  return buffer.toString('base64');
}

class TimeRecordsService {

  async createRecord(userId, recordType, photoFile, req, isOfficialTablet = false) {
    try {
      // 1. Lockdown para Consultoras fora do Totem Oficial
      const userRes = await db.query('SELECT cargo FROM users WHERE id = $1', [userId]);
      const cargo = userRes.rows[0]?.cargo?.toLowerCase() || '';
      const isConsultor = cargo.includes('consultor') || cargo.includes('consutor');

      if (isConsultor && !isOfficialTablet) {
        const error = new Error('Consultoras devem utilizar o Totem Oficial na agência ou o fluxo de registro externo.');
        error.status = 403;
        error.code = 'EXTERNAL_PUNCH_REQUIRED';
        throw error;
      }

      // 2. Validar duplicados (mesmo tipo em menos de 5 minutos)
      const lastPunchRes = await db.query(`
        SELECT record_type, timestamp 
        FROM time_records 
        WHERE user_id = $1 
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [userId]);

      if (lastPunchRes.rows.length > 0) {
        const lastPunch = lastPunchRes.rows[0];
        const diffMinutes = (new Date() - new Date(lastPunch.timestamp)) / 1000 / 60;
        if (lastPunch.record_type === recordType && diffMinutes < 5) {
          const error = new Error(`Você já registrou "${recordType}" há ${Math.floor(diffMinutes)} minuto(s)`);
          error.status = 400;
          throw error;
        }
      }

      // 3. Valida sequência de registros (Entrada -> Intervalo -> Retorno -> Saída)
      await this.validateRecordSequence(userId, recordType);

      // Processa foto
      let photoData = null;
      if (photoFile) {
        photoData = photoFile.buffer;
      }

      const timestamp = dateHelper.getNowInBR();

      // Insere registro
      const result = await db.query(`
        INSERT INTO time_records 
        (user_id, record_type, timestamp, photo_data, ip_address, user_agent, is_manual, registered_by)
        VALUES ($1, $2, $3, $4, $5, $6, false, $1)
        RETURNING id, user_id, record_type, timestamp
      `, [
        userId,
        recordType,
        timestamp,
        photoData,
        req.ip,
        req.get('user-agent')
      ]);

      const record = result.rows[0];

      // 4. Atualizar banco de horas automaticamente
      await this.atualizarBancoHoras(userId, timestamp);

      // Log de auditoria
      await auditService.log(
        'time_record_created',
        userId,
        null,
        `Registro de ponto: ${recordType}`,
        { recordId: record.id, timestamp },
        req
      );

      return record;

    } catch (error) {
      logger.error('Erro no Service ao criar registro de ponto', { error: error.message });
      throw error;
    }
  }

  async atualizarBancoHoras(userId, date) {
    try {
      const dataFormatada = dateHelper.getLocalDate(date);

      // Buscar configurações do usuário
      const userResult = await db.query(
        'SELECT expected_daily_hours, work_hours_start, work_hours_end FROM users WHERE id = $1',
        [userId]
      );
      const user = userResult.rows[0];
      const horasEsperadas = parseFloat(user?.expected_daily_hours || 8);

      // Buscar registros do dia (usando timezone correto)
      const registros = await db.query(`
        SELECT record_type, timestamp 
        FROM time_records 
        WHERE user_id = $1 AND DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = $2
        ORDER BY timestamp ASC
      `, [userId, dataFormatada]);

      let horasTrabalhadas = 0;

      if (registros.rows.length >= 2) {
        const registrosDia = registros.rows;
        let entrada = registrosDia.find(r => r.record_type === 'entrada');
        let saidaFinal = registrosDia.find(r => r.record_type === 'saida_final');

        if (entrada && saidaFinal) {
          const tsEntrada = new Date(entrada.timestamp);
          const tsSaida = new Date(saidaFinal.timestamp);
          let totalMs = tsSaida - tsEntrada;

          // Descontar intervalo
          const saidaIntervalo = registrosDia.find(r => r.record_type === 'saida_intervalo');
          const retornoIntervalo = registrosDia.find(r => r.record_type === 'retorno_intervalo');

          if (saidaIntervalo && retornoIntervalo) {
            const pausaMs = new Date(retornoIntervalo.timestamp) - new Date(saidaIntervalo.timestamp);
            if (pausaMs > 0) totalMs -= pausaMs;
          }

          horasTrabalhadas = Math.max(0, totalMs / 1000 / 60 / 60);
        }
      }

      // Upsert no banco de horas
      await db.query(`
        INSERT INTO hours_bank (user_id, date, hours_worked, hours_expected)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, date) 
        DO UPDATE SET 
          hours_worked = EXCLUDED.hours_worked,
          hours_expected = EXCLUDED.hours_expected,
          updated_at = NOW()
      `, [userId, dataFormatada, horasTrabalhadas.toFixed(2), horasEsperadas]);

      logger.info('Banco de horas processado', { userId, date: dataFormatada, total: horasTrabalhadas.toFixed(2) });

    } catch (error) {
      logger.error('Erro ao processar banco de horas no Service', { error: error.message });
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

      // Validações de sequência (permite saída final direto após entrada, sem exigir intervalo)
      const validSequences = {
        'entrada': [null],
        'saida_intervalo': ['entrada'],
        'retorno_intervalo': ['saida_intervalo'],
        'saida_final': ['entrada', 'retorno_intervalo']
      };

      if (!validSequences[recordType].includes(lastRecord)) {
        const messages = {
          'entrada': 'Você já registrou entrada hoje',
          'saida_intervalo': 'Você precisa registrar entrada antes de sair para intervalo',
          'retorno_intervalo': 'Você precisa sair para intervalo antes de retornar',
          'saida_final': 'Você precisa registrar entrada (ou retornar do intervalo) antes da saída final'
        };

        throw new Error(messages[recordType] || 'Sequência de registro inválida');
      }

      // ✅ Validação de Intervalo Mínimo de 1 Hora (apenas para retorno_intervalo)
      if (recordType === 'retorno_intervalo') {
        const lastTimestampResult = await db.query(`
          SELECT timestamp FROM time_records 
          WHERE user_id = $1 
          AND record_type = 'saida_intervalo'
          AND DATE(timestamp) = CURRENT_DATE
          ORDER BY timestamp DESC LIMIT 1
        `, [userId]);

        if (lastTimestampResult.rows.length > 0) {
          const lastTime = new Date(lastTimestampResult.rows[0].timestamp);
          const now = new Date();
          const diffMinutes = (now - lastTime) / 1000 / 60;

          if (diffMinutes < 60) {
            const remainingMinutes = Math.ceil(60 - diffMinutes);
            throw new Error(`Intervalo mínimo de 1 hora não cumprido. Aguarde mais ${remainingMinutes} minutos.`);
          }
        }
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

      // Cria alerta (não bloqueia o registro se falhar)
      try {
        await notificationService.criarAlerta(
          userId,
          'registro_manual',
          'info',
          'Registro de ponto manual',
          `Gestor registrou ponto manualmente: ${recordType}`,
          { recordId: record.id, reason }
        );
      } catch (alertError) {
        logger.error('Erro ao criar alerta de registro manual', { error: alertError.message });
      }

      logger.info('Registro manual criado', { userId, recordType, registeredBy });

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
        tr.photo_data,
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

      const rows = result.rows.map(row => ({
        ...row,
        photo_data: photoBufferToBase64(row.photo_data)
      }));

      return rows;

    } catch (error) {
      logger.error('Erro ao buscar registros por data', { error: error.message });
      throw error;
    }
  }

  async getTodayRecords() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const result = await db.query(`
      SELECT
        tr.id,
        tr.user_id,
        tr.record_type,
        tr.timestamp,
        tr.photo_data,
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
    `, [today]);

      const rows = result.rows.map(row => ({
        ...row,
        photo_data: photoBufferToBase64(row.photo_data)
      }));

      logger.info('Registros de hoje carregados', { count: rows.length });

      return rows;

    } catch (error) {
      logger.error('Erro ao buscar registros de hoje', { error: error.message });
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
