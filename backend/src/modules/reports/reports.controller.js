const db = require('../../config/database');
const logger = require('../../utils/logger');
const reportsService = require('./reports.service');
const pdfGenerator = require('../../services/pdfGeneratorService');

// Função auxiliar para tempo relativo
function getTempoRelativo(timestamp) {
  const agora = new Date();
  const tempo = new Date(timestamp);
  const diff = Math.floor((agora - tempo) / 1000);

  if (diff < 60) return 'agora há pouco';
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hora(s) atrás`;
  return `${Math.floor(diff / 86400)} dia(s) atrás`;
}

class ReportsController {

  async getDashboard(req, res) {
    try {
      const hoje = new Date().toISOString().split('T')[0];

      // 1. Chamar o Service para pegar todas as estatísticas calculadas
      const stats = await reportsService.getDashboardStats();

      // 2. Gráfico Semanal (Consolidado)
      const totalFuncionarios = await db.query(`SELECT COUNT(*) as total FROM users WHERE status = 'ativo'`);
      const total = parseInt(totalFuncionarios.rows[0].total) || 0;

      const dadosSemanais = [];
      for (let i = 6; i >= 0; i--) {
        const data = new Date();
        data.setDate(data.getDate() - i);
        const dataStr = data.toISOString().split('T')[0];

        const presentesDia = await db.query(`
          SELECT (
            SELECT COUNT(DISTINCT user_id) FROM time_records WHERE DATE(timestamp) = $1 AND record_type = 'entrada'
          ) + (
            SELECT COUNT(DISTINCT user_id) FROM duty_shifts WHERE date = $1
          ) as total
        `, [dataStr]);

        const presentes = parseInt(presentesDia.rows[0].total) || 0;

        dadosSemanais.push({
          data: dataStr,
          dia: data.toLocaleDateString('pt-BR', { weekday: 'short' }),
          presentes: presentes,
          ausentes: Math.max(0, total - presentes)
        });
      }

      // 3. Atividades Recentes
      const atividadesRecentes = await db.query(`
        (
          SELECT 
            u.nome as usuario,
            'registrou ' || 
            CASE tr.record_type
              WHEN 'entrada' THEN 'entrada'
              WHEN 'saida_intervalo' THEN 'saída para intervalo'
              WHEN 'retorno_intervalo' THEN 'retorno do intervalo'
              WHEN 'saida_final' THEN 'saída final'
            END as acao,
            tr.timestamp,
            'clt' as tipo
          FROM time_records tr
          JOIN users u ON tr.user_id = u.id
          WHERE DATE(tr.timestamp) = $1
          ORDER BY tr.timestamp DESC
          LIMIT 5
        )
        UNION ALL
        (
          SELECT 
            u.nome as usuario,
            'marcou presença no plantão' as acao,
            ds.check_in_time::timestamp as timestamp,
            'plantonista' as tipo
          FROM duty_shifts ds
          JOIN users u ON ds.user_id = u.id
          WHERE ds.date = $1
          ORDER BY ds.check_in_time DESC
          LIMIT 5
        )
        ORDER BY timestamp DESC
        LIMIT 10
      `, [hoje]);

      res.json({
        success: true,
        data: {
          ...stats,
          grafico_semanal: dadosSemanais,
          atividades_recentes: atividadesRecentes.rows.map(row => ({
            usuario: row.usuario,
            acao: row.acao,
            timestamp: row.timestamp,
            tipo: row.tipo,
            tempo_relativo: getTempoRelativo(row.timestamp)
          }))
        }
      });

    } catch (error) {
      logger.error('Erro no dashboard', { error: error.message });
      res.status(500).json({ success: false, error: 'Erro ao carregar dashboard' });
    }
  }

  // Relatório mensal individual
  async getMonthlyIndividual(req, res) {
    try {
      const { userId, year, month } = req.params;

      // Buscar dados do usuário
      const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (user.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const userData = user.rows[0];
      const isPlant = userData.is_duty_shift_only;

      let dados = [];

      if (isPlant) {
        // PLANTONISTA: Buscar presenças
        const presenças = await db.query(`
          SELECT 
            date,
            check_in_time,
            notes
          FROM duty_shifts
          WHERE user_id = $1
          AND EXTRACT(YEAR FROM date) = $2
          AND EXTRACT(MONTH FROM date) = $3
          ORDER BY date
        `, [userId, year, month]);

        dados = presenças.rows.map(row => ({
          data: row.date,
          tipo: 'presenca',
          check_in: row.check_in_time,
          observacao: row.notes
        }));

      } else {
        // CLT: Buscar registros completos
        const registros = await db.query(`
          SELECT 
            DATE(timestamp) as data,
            record_type,
            timestamp
          FROM time_records
          WHERE user_id = $1
          AND EXTRACT(YEAR FROM timestamp) = $2
          AND EXTRACT(MONTH FROM timestamp) = $3
          ORDER BY timestamp
        `, [userId, year, month]);

        // Agrupar por dia
        const porDia = {};
        registros.rows.forEach(r => {
          const dia = r.data.toISOString().split('T')[0];
          if (!porDia[dia]) porDia[dia] = {};
          porDia[dia][r.record_type] = r.timestamp;
        });

        dados = Object.keys(porDia).map(dia => ({
          data: dia,
          entrada: porDia[dia].entrada,
          saida_intervalo: porDia[dia].saida_intervalo,
          retorno_intervalo: porDia[dia].retorno_intervalo,
          saida_final: porDia[dia].saida_final
        }));
      }

      res.json({
        success: true,
        data: {
          usuario: userData,
          periodo: { mes: month, ano: year },
          registros: dados
        }
      });

    } catch (error) {
      logger.error('Erro no relatório individual', { error: error.message });
      res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
  }

  // Relatório mensal todos CLT
  async getMonthlyCLT(req, res) {
    try {
      const { year, month } = req.params;

      const funcionarios = await db.query(`
        SELECT id, nome, matricula, cargo
        FROM users
        WHERE status = 'ativo' AND is_duty_shift_only = false
        ORDER BY nome
      `);

      const relatorios = [];

      for (const func of funcionarios.rows) {
        const registros = await db.query(`
          SELECT 
            DATE(timestamp) as data,
            record_type,
            timestamp
          FROM time_records
          WHERE user_id = $1
          AND EXTRACT(YEAR FROM timestamp) = $2
          AND EXTRACT(MONTH FROM timestamp) = $3
          ORDER BY timestamp
        `, [func.id, year, month]);

        const porDia = {};
        registros.rows.forEach(r => {
          const dia = r.data.toISOString().split('T')[0];
          if (!porDia[dia]) porDia[dia] = {};
          porDia[dia][r.record_type] = r.timestamp;
        });

        const dias = Object.keys(porDia).map(dia => ({
          data: dia,
          entrada: porDia[dia].entrada,
          saida_final: porDia[dia].saida_final,
          completo: !!(porDia[dia].entrada && porDia[dia].saida_final)
        }));

        relatorios.push({
          funcionario: func,
          dias_trabalhados: dias.filter(d => d.completo).length,
          total_dias: dias.length,
          detalhes: dias
        });
      }

      res.json({
        success: true,
        data: {
          tipo: 'CLT',
          periodo: { mes: month, ano: year },
          funcionarios: relatorios
        }
      });

    } catch (error) {
      logger.error('Erro no relatório CLT', { error: error.message });
      res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
  }

  // Relatório mensal todos Plantonistas
  async getMonthlyPlantonistas(req, res) {
    try {
      const { year, month } = req.params;

      const plantonistas = await db.query(`
        SELECT id, nome, matricula, cargo
        FROM users
        WHERE status = 'ativo' AND is_duty_shift_only = true
        ORDER BY nome
      `);

      const relatorios = [];

      for (const plant of plantonistas.rows) {
        const presenças = await db.query(`
          SELECT 
            date,
            check_in_time
          FROM duty_shifts
          WHERE user_id = $1
          AND EXTRACT(YEAR FROM date) = $2
          AND EXTRACT(MONTH FROM date) = $3
          ORDER BY date
        `, [plant.id, year, month]);

        relatorios.push({
          plantonista: plant,
          total_presencas: presenças.rows.length,
          detalhes: presenças.rows.map(p => ({
            data: p.date,
            horario: p.check_in_time
          }))
        });
      }

      res.json({
        success: true,
        data: {
          tipo: 'Plantonistas',
          periodo: { mes: month, ano: year },
          plantonistas: relatorios
        }
      });

    } catch (error) {
      logger.error('Erro no relatório Plantonistas', { error: error.message });
      res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
  }

  async getWeekly(req, res) {
    res.json({ success: true, data: [], message: 'Em desenvolvimento' });
  }

  async getMonthly(req, res) {
    res.json({ success: true, data: [], message: 'Em desenvolvimento' });
  }

  async getActivity(req, res) {
    res.json({ success: true, data: [], message: 'Em desenvolvimento' });
  }
  // --- ANALYTICS RH (Fase 6) ---

  async getAbsenteismo(req, res, next) {
    try {
      const result = await db.query(`
        SELECT 
          to_char(date, 'YYYY-MM') as mes,
          COUNT(*) filter (where status_dia = 'Ausente') as faltas,
          COUNT(*) as total_dias_uteis
        FROM daily_journey dj
        JOIN monthly_closings mc ON to_char(dj.date, 'YYYY-MM') = mc.month_year
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 6
      `);
      // Nota: Essa query é simplificada. Idealmente precisa de uma tabela de dias úteis esperados.
      // Vou usar uma abordagem mais dinâmica baseada nos daily_journey gerados.

      const stats = await reportsService.getAbsenteismoStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async getOvertimeStats(req, res, next) {
    try {
      const stats = await reportsService.getOvertimeStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  // ✅ Gerar PDF do Espelho de Ponto
  async generateSignedPDF(req, res) {
    try {
      const { userId, year, month, signature } = req.body;

      // 1. Buscar dados do usuário
      const userRes = await db.query('SELECT id, nome, matricula, cargo, status FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
      const user = userRes.rows[0];

      // 2. Buscar registros diretamente de time_records (fonte confiável)
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
      `, [userId, year, month]);

      // 3. Agrupar por dia
      const porDia = {};
      registros.rows.forEach(r => {
        const dia = r.data.toISOString().split('T')[0];
        if (!porDia[dia]) porDia[dia] = {};
        const hora = new Date(r.ts_local).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        porDia[dia][r.record_type] = hora;
        porDia[dia][r.record_type + '_ts'] = new Date(r.ts_local);
      });

      // 4. Montar detalhes com cálculo de horas
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

        const statusDia = d.entrada && d.saida_final ? 'Completo' : (d.entrada ? 'Incompleto' : 'Ausente');

        return {
          date: dia,
          entrada: d.entrada || null,
          saida_intervalo: d.saida_intervalo || null,
          retorno_intervalo: d.retorno_intervalo || null,
          saida_final: d.saida_final || null,
          hours_worked: horasTrabalhadas.toFixed(2),
          status_dia: statusDia
        };
      });

      // 5. Buscar horas do banco (saldo)
      const bancoRes = await db.query(`
        SELECT COALESCE(SUM(hours_worked), 0) as total_trabalhado,
               COALESCE(SUM(hours_expected), 0) as total_esperado
        FROM hours_bank
        WHERE user_id = $1
        AND EXTRACT(YEAR FROM date) = $2
        AND EXTRACT(MONTH FROM date) = $3
      `, [userId, year, month]);

      const banco = bancoRes.rows[0];

      const reportData = {
        resumo: {
          total_horas: totalHoras.toFixed(2),
          dias_completos: diasCompletos,
          dias_incompletos: diasIncompletos,
          ausencias: 0,
          horas_esperadas: parseFloat(banco.total_esperado || 0).toFixed(2),
          saldo: (parseFloat(banco.total_trabalhado || 0) - parseFloat(banco.total_esperado || 0)).toFixed(2)
        },
        detalhes
      };

      const userData = { user, period: { month, year } };

      const signatureData = signature ? {
        hash: 'ASSINATURA_DIGITAL_VIA_PAINEL',
        date: new Date(),
        ip: req.ip || 'N/A',
        image: signature
      } : null;

      // 6. Gerar PDF
      const pdfDoc = await pdfGenerator.generateTimeMirror(userData, reportData, signatureData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=espelho_${user.nome.replace(/\s/g, '_')}_${month}_${year}.pdf`);

      pdfDoc.pipe(res);
      pdfDoc.end();

    } catch (error) {
      logger.error('Erro ao gerar PDF Espelho', { error: error.message, stack: error.stack });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao gerar documento PDF' });
      }
    }
  }
}

module.exports = new ReportsController();