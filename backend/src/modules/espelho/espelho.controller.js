const db = require('../../config/database');
const logger = require('../../utils/logger');
const { generateAndStorePdf } = require('../../services/termsPdfService');

class EspelhoController {

  // 1. Verificar matrícula — retorna nome do funcionário
  async verificarMatricula(req, res) {
    try {
      const { matricula } = req.body;

      if (!matricula || matricula.trim().length < 2) {
        return res.status(400).json({ error: 'Informe uma matrícula válida' });
      }

      const result = await db.query(
        'SELECT id, nome, matricula, cargo, is_duty_shift_only, terms_accepted_at FROM users WHERE matricula = $1 AND status = $2',
        [matricula.trim(), 'ativo']
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Matrícula não encontrada ou funcionário inativo' });
      }

      const user = result.rows[0];

      res.json({
        success: true,
        data: {
          id: user.id,
          nome: user.nome,
          matricula: user.matricula,
          cargo: user.cargo,
          is_plantonista: user.is_duty_shift_only,
          termsRequired: !user.terms_accepted_at
        }
      });

    } catch (error) {
      logger.error('Erro ao verificar matrícula no espelho', { error: error.message });
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  // 2. Visualizar espelho de ponto do mês
  async visualizarEspelho(req, res) {
    try {
      const { matricula, year, month } = req.body;

      if (!matricula || !year || !month) {
        return res.status(400).json({ error: 'Matrícula, ano e mês são obrigatórios' });
      }

      // Buscar usuário
      const userRes = await db.query(
        'SELECT id, nome, matricula, cargo, is_duty_shift_only FROM users WHERE matricula = $1 AND status = $2',
        [matricula.trim(), 'ativo']
      );

      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'Matrícula não encontrada' });
      }

      const user = userRes.rows[0];

      // Buscar registros do mês com conversão UTC→BRT
      const registros = await db.query(`
        SELECT
          to_char(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') as data,
          record_type,
          to_char(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') as hora_brt,
          timestamp
        FROM time_records
        WHERE user_id = $1
        AND EXTRACT(YEAR FROM timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = $2
        AND EXTRACT(MONTH FROM timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = $3
        ORDER BY timestamp ASC
      `, [user.id, year, month]);

      // Agrupar por dia
      const porDia = {};
      registros.rows.forEach(r => {
        if (!porDia[r.data]) porDia[r.data] = {};
        porDia[r.data][r.record_type] = r.hora_brt;
        porDia[r.data][r.record_type + '_ts'] = new Date(r.timestamp);
      });

      // Montar detalhes com cálculo de horas
      let totalHoras = 0;
      let diasCompletos = 0;
      let diasIncompletos = 0;

      const detalhes = Object.keys(porDia).sort().map(dia => {
        const d = porDia[dia];
        let horasTrabalhadas = 0;

        if (d.entrada_ts && d.saida_final_ts) {
          let totalMs = d.saida_final_ts - d.entrada_ts;
          if (d.saida_intervalo_ts && d.retorno_intervalo_ts) {
            const pausaMs = d.retorno_intervalo_ts - d.saida_intervalo_ts;
            if (pausaMs > 0) totalMs -= pausaMs;
          }
          horasTrabalhadas = Math.max(0, totalMs / 1000 / 60 / 60);
          diasCompletos++;
        } else if (d.entrada) {
          diasIncompletos++;
        }

        totalHoras += horasTrabalhadas;
        const dataObj = new Date(dia + 'T12:00:00');
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

        return {
          data: dia,
          dia_semana: diasSemana[dataObj.getDay()],
          entrada: d.entrada || null,
          saida_intervalo: d.saida_intervalo || null,
          retorno_intervalo: d.retorno_intervalo || null,
          saida_final: d.saida_final || null,
          horas: horasTrabalhadas.toFixed(2),
          status: d.entrada && d.saida_final ? 'Completo' : (d.entrada ? 'Incompleto' : 'Ausente')
        };
      });

      // Calcular horas esperadas (dias úteis - feriados)
      const expectedDaily = 8; // padrão CLT
      let feriadosDates = [];
      try {
        const ferRes = await db.query(
          'SELECT date FROM holidays WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2',
          [year, month]
        );
        feriadosDates = ferRes.rows.map(r => r.date.toISOString().split('T')[0]);
      } catch (e) { /* ignora */ }

      const hoje = new Date();
      const ultimoDia = new Date(year, month, 0).getDate();
      const diaLimite = (parseInt(year) === hoje.getFullYear() && parseInt(month) === hoje.getMonth() + 1)
        ? hoje.getDate() : ultimoDia;

      let diasUteis = 0;
      for (let d = 1; d <= diaLimite; d++) {
        const dateObj = new Date(year, month - 1, d);
        const dow = dateObj.getDay();
        const dateStr = dateObj.toISOString().split('T')[0];
        if (dow !== 0 && dow !== 6 && !feriadosDates.includes(dateStr)) {
          diasUteis++;
        }
      }
      const horasEsperadas = diasUteis * expectedDaily;
      const saldo = totalHoras - horasEsperadas;

      // Verificar se já assinou
      const sigRes = await db.query(
        'SELECT id, signed_at FROM espelho_signatures WHERE user_id = $1 AND year = $2 AND month = $3',
        [user.id, year, month]
      );

      res.json({
        success: true,
        data: {
          usuario: {
            nome: user.nome,
            matricula: user.matricula,
            cargo: user.cargo
          },
          periodo: { mes: parseInt(month), ano: parseInt(year) },
          resumo: {
            total_horas: totalHoras.toFixed(2),
            horas_esperadas: horasEsperadas.toFixed(2),
            saldo: saldo.toFixed(2),
            dias_completos: diasCompletos,
            dias_incompletos: diasIncompletos,
            dias_uteis: diasUteis,
            total_registros: detalhes.length
          },
          registros: detalhes,
          assinatura: sigRes.rows.length > 0 ? {
            assinado: true,
            data_assinatura: sigRes.rows[0].signed_at
          } : {
            assinado: false
          }
        }
      });

    } catch (error) {
      logger.error('Erro ao visualizar espelho', { error: error.message });
      res.status(500).json({ error: 'Erro ao carregar espelho de ponto' });
    }
  }

  // 3. Assinar espelho de ponto
  async assinarEspelho(req, res) {
    try {
      const { matricula, year, month, signature } = req.body;

      if (!matricula || !year || !month || !signature) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios (matrícula, ano, mês, assinatura)' });
      }

      // Buscar usuário
      const userRes = await db.query(
        'SELECT id, nome FROM users WHERE matricula = $1 AND status = $2',
        [matricula.trim(), 'ativo']
      );

      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'Matrícula não encontrada' });
      }

      const user = userRes.rows[0];

      // Verificar se já assinou
      const existing = await db.query(
        'SELECT id FROM espelho_signatures WHERE user_id = $1 AND year = $2 AND month = $3',
        [user.id, year, month]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Espelho já foi assinado para este mês' });
      }

      // Salvar assinatura
      const result = await db.query(`
        INSERT INTO espelho_signatures (user_id, year, month, signature_data, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, signed_at
      `, [
        user.id,
        year,
        month,
        signature,
        req.ip,
        req.get('user-agent')
      ]);

      logger.info('Espelho assinado', { userId: user.id, nome: user.nome, year, month });

      res.json({
        success: true,
        message: `Espelho de ponto assinado com sucesso por ${user.nome}`,
        data: {
          id: result.rows[0].id,
          signed_at: result.rows[0].signed_at
        }
      });

    } catch (error) {
      logger.error('Erro ao assinar espelho', { error: error.message });
      res.status(500).json({ error: 'Erro ao registrar assinatura' });
    }
  }

  // 4. Aceitar Termo de Compromisso (público — sem JWT)
  async aceitarTermos(req, res) {
    try {
      const { matricula, signature, terms_version } = req.body;

      if (!matricula || !signature || !terms_version) {
        return res.status(400).json({ error: 'Matrícula, assinatura e versão do termo são obrigatórios' });
      }

      // Buscar usuário
      const userRes = await db.query(
        'SELECT id, nome, matricula, cargo, terms_accepted_at FROM users WHERE matricula = $1 AND status = $2',
        [matricula.trim(), 'ativo']
      );

      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'Matrícula não encontrada' });
      }

      const user = userRes.rows[0];

      // Verificar se já aceitou esta versão
      const existing = await db.query(
        'SELECT id FROM terms_acceptances WHERE user_id = $1 AND terms_version = $2',
        [user.id, terms_version]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Termo já foi aceito anteriormente' });
      }

      const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip;
      const userAgent = req.headers['user-agent'] || '';

      // Inserir aceite na tabela de termos
      const result = await db.query(
        `INSERT INTO terms_acceptances (user_id, terms_version, signature_data, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, accepted_at`,
        [user.id, terms_version, signature, ip, userAgent]
      );

      // Atualizar flag no usuário
      await db.query(
        'UPDATE users SET terms_accepted_at = NOW() WHERE id = $1',
        [user.id]
      );

      // Audit log
      try {
        const auditService = require('../../services/auditService');
        await auditService.log('accept_terms', user.id, 'terms_acceptances', result.rows[0].id, null, {
          terms_version,
          ip_address: ip,
          channel: 'espelho'
        }, req);
      } catch (e) {
        logger.error('Erro ao logar aceite de termos no audit', { error: e.message });
      }

      logger.info('Termo de compromisso aceito via espelho', {
        userId: user.id,
        nome: user.nome,
        terms_version,
        ip
      });

      // Gerar e armazenar PDF do termo assinado (assíncrono, não bloqueia resposta)
      generateAndStorePdf(
        result.rows[0].id,
        user,
        signature,
        ip,
        userAgent,
        result.rows[0].accepted_at
      ).catch(e => logger.error('Falha ao gerar PDF do termo', { error: e.message }));

      res.json({
        success: true,
        message: `Termo aceito com sucesso por ${user.nome}`,
        data: {
          accepted_at: result.rows[0].accepted_at,
          terms_version
        }
      });

    } catch (error) {
      logger.error('Erro ao aceitar termos via espelho', { error: error.message });
      res.status(500).json({ error: 'Erro ao registrar aceite do termo' });
    }
  }

  // 5. Verificar status da assinatura
  async statusAssinatura(req, res) {
    try {
      const { matricula, year, month } = req.body;

      const userRes = await db.query(
        'SELECT id FROM users WHERE matricula = $1 AND status = $2',
        [matricula.trim(), 'ativo']
      );

      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'Matrícula não encontrada' });
      }

      const sigRes = await db.query(
        'SELECT id, signed_at FROM espelho_signatures WHERE user_id = $1 AND year = $2 AND month = $3',
        [userRes.rows[0].id, year, month]
      );

      res.json({
        success: true,
        data: {
          assinado: sigRes.rows.length > 0,
          signed_at: sigRes.rows[0]?.signed_at || null
        }
      });

    } catch (error) {
      logger.error('Erro ao verificar status assinatura', { error: error.message });
      res.status(500).json({ error: 'Erro interno' });
    }
  }
}

module.exports = new EspelhoController();
