const db = require('../../config/database');
const logger = require('../../utils/logger');
const PDFDocument = require('pdfkit');

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

      // 1. PRESENTES CLT
      const presentesCLT = await db.query(`
        SELECT COUNT(DISTINCT user_id) as total
        FROM time_records
        WHERE DATE(timestamp) = $1
        AND record_type = 'entrada'
      `, [hoje]);

      // 2. PRESENTES PLANTONISTAS
      const presentesPlantonistas = await db.query(`
        SELECT COUNT(DISTINCT user_id) as total
        FROM duty_shifts
        WHERE date = $1
      `, [hoje]);

      const totalPresentes = (parseInt(presentesCLT.rows[0].total) || 0) +
        (parseInt(presentesPlantonistas.rows[0].total) || 0);

      // 3. TOTAL FUNCIONÁRIOS
      const totalFuncionarios = await db.query(`
        SELECT COUNT(*) as total
        FROM users
        WHERE status = 'ativo'
      `);
      const total = parseInt(totalFuncionarios.rows[0].total) || 0;
      const ausencias = Math.max(0, total - totalPresentes);

      // 4. SEM SAÍDA
      const semSaida = await db.query(`
        SELECT COUNT(DISTINCT tr1.user_id) as total
        FROM time_records tr1
        WHERE DATE(tr1.timestamp) = $1
        AND tr1.record_type = 'entrada'
        AND NOT EXISTS (
          SELECT 1 FROM time_records tr2
          WHERE tr2.user_id = tr1.user_id
          AND DATE(tr2.timestamp) = $1
          AND tr2.record_type = 'saida_final'
        )
      `, [hoje]);

      // 5. GRÁFICO SEMANAL
      const dadosSemanais = [];
      for (let i = 6; i >= 0; i--) {
        const data = new Date();
        data.setDate(data.getDate() - i);
        const dataStr = data.toISOString().split('T')[0];

        const cltDia = await db.query(`
          SELECT COUNT(DISTINCT user_id) as total
          FROM time_records
          WHERE DATE(timestamp) = $1 AND record_type = 'entrada'
        `, [dataStr]);

        const plantDia = await db.query(`
          SELECT COUNT(DISTINCT user_id) as total
          FROM duty_shifts
          WHERE date = $1
        `, [dataStr]);

        const presentes = (parseInt(cltDia.rows[0].total) || 0) + (parseInt(plantDia.rows[0].total) || 0);

        dadosSemanais.push({
          data: dataStr,
          dia: data.toLocaleDateString('pt-BR', { weekday: 'short' }),
          presentes: presentes,
          ausentes: Math.max(0, total - presentes)
        });
      }

      // 6. ATIVIDADES
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

      const response = {
        success: true,
        data: {
          presentes: totalPresentes,
          ausencias: ausencias,
          sem_saida: parseInt(semSaida.rows[0].total) || 0,
          alertas: 0,
          grafico_semanal: dadosSemanais,
          atividades_recentes: atividadesRecentes.rows.map(row => ({
            usuario: row.usuario,
            acao: row.acao,
            timestamp: row.timestamp,
            tipo: row.tipo,
            tempo_relativo: getTempoRelativo(row.timestamp)
          }))
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('Erro no dashboard', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Erro ao carregar dashboard'
      });
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

  // ✅ Gerar PDF Assinado
  async generateSignedPDF(req, res) {
    try {
      const { userId, year, month, signature, type = 'individual' } = req.body;

      // 1. Buscar dados do relatório (reutilizando a lógica existente)
      // Nota: Idealmente refatoraríamos a lógica de busca para um Service para evitar duplicação.
      // Vou simplificar chamando o banco diretamente aqui por enquanto.

      const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
      const user = userRes.rows[0];
      const isPlant = user.is_duty_shift_only;

      let registros = [];

      if (isPlant) {
        // Busca presenças de plantonista
        const res = await db.query(`
          SELECT date as data, 'presenca' as record_type, check_in_time as timestamp
          FROM duty_shifts
          WHERE user_id = $1
          AND EXTRACT(YEAR FROM date) = $2
          AND EXTRACT(MONTH FROM date) = $3
          ORDER BY date, check_in_time
        `, [userId, year, month]);
        registros = res.rows;
      } else {
        // Busca registros de CLT
        const res = await db.query(`
          SELECT DATE(timestamp) as data, record_type, timestamp
          FROM time_records
          WHERE user_id = $1
          AND EXTRACT(YEAR FROM timestamp) = $2
          AND EXTRACT(MONTH FROM timestamp) = $3
          ORDER BY timestamp
        `, [userId, year, month]);
        registros = res.rows;
      }

      // 2. Gerar PDF
      const doc = new PDFDocument({ margin: 50 });

      // Configurar headers para download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=espelho_ponto_${user.nome.replace(/\s/g, '_')}_${month}_${year}.pdf`);

      doc.pipe(res);

      // Título
      doc.fontSize(18).text('Espelho de Ponto', { align: 'center' });
      doc.moveDown();

      // Info do Usuário
      doc.fontSize(12).text(`Funcionário: ${user.nome}`);
      doc.text(`Matrícula: ${user.matricula}`);
      doc.text(`Período: ${month}/${year}`);
      doc.moveDown();

      // Tabela (Header)
      const tableTop = 200;
      doc.font('Helvetica-Bold');
      doc.text('Data', 50, tableTop);
      doc.text('Registros', 200, tableTop);
      doc.font('Helvetica');
      doc.moveDown();

      let y = tableTop + 25;

      // Agrupar e imprimir registros
      const porDia = {};
      registros.forEach(r => {
        const dia = r.data.toISOString().split('T')[0];
        if (!porDia[dia]) porDia[dia] = [];
        porDia[dia].push(new Date(r.timestamp).toLocaleTimeString('pt-BR'));
      });

      Object.entries(porDia).forEach(([data, horarios]) => {
        if (y > 700) { // Nova página
          doc.addPage();
          y = 50;
        }

        doc.text(new Date(data).toLocaleDateString('pt-BR'), 50, y);
        // Se for plantonista, só tem um horário. Se for CLT, pode ter vários.
        doc.text(isPlant ? 'Presença Confirmada' : horarios.join(' - '), 200, y);
        y += 20;
      });

      doc.moveDown(4);

      // Assinatura
      if (signature) {
        doc.text('Assinatura do Colaborador:', 50, doc.y);
        doc.moveDown();
        const signatureBuffer = Buffer.from(signature.split(',')[1], 'base64');
        doc.image(signatureBuffer, 50, doc.y, { width: 200 });
      } else {
        doc.text('__________________________________________', 50, doc.y);
        doc.text('Assinatura do Colaborador(a)', 50, doc.y + 15);
      }

      doc.moveDown(4);
      doc.text('__________________________________________', 300, doc.y - 80); // Alinhado com a assinatura visualmente
      doc.text('Assinatura do Gestor', 300, doc.y - 65);

      doc.end();

    } catch (error) {
      logger.error('Erro ao gerar PDF', { error: error.message });
      // Se já enviou headers, não pode enviar json
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  }
}

module.exports = new ReportsController();