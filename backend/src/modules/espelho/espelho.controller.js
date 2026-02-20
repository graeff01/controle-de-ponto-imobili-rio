const db = require('../../config/database');
const logger = require('../../utils/logger');

class EspelhoController {

  // 1. Verificar matrícula — retorna nome do funcionário
  async verificarMatricula(req, res) {
    try {
      const { matricula } = req.body;

      if (!matricula || matricula.trim().length < 2) {
        return res.status(400).json({ error: 'Informe uma matrícula válida' });
      }

      const result = await db.query(
        'SELECT id, nome, matricula, cargo, is_duty_shift_only FROM users WHERE matricula = $1 AND status = $2',
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
          is_plantonista: user.is_duty_shift_only
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

      // Buscar registros do mês
      const registros = await db.query(`
        SELECT
          DATE(timestamp AT TIME ZONE 'America/Sao_Paulo') as data,
          record_type,
          timestamp AT TIME ZONE 'America/Sao_Paulo' as ts_local
        FROM time_records
        WHERE user_id = $1
        AND EXTRACT(YEAR FROM timestamp AT TIME ZONE 'America/Sao_Paulo') = $2
        AND EXTRACT(MONTH FROM timestamp AT TIME ZONE 'America/Sao_Paulo') = $3
        ORDER BY timestamp ASC
      `, [user.id, year, month]);

      // Agrupar por dia
      const porDia = {};
      registros.rows.forEach(r => {
        const dia = r.data.toISOString().split('T')[0];
        if (!porDia[dia]) porDia[dia] = {};
        const ts = new Date(r.ts_local);
        const hora = ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        porDia[dia][r.record_type] = hora;
        porDia[dia][r.record_type + '_ts'] = ts;
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
            dias_completos: diasCompletos,
            dias_incompletos: diasIncompletos,
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

  // 4. Verificar status da assinatura
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
