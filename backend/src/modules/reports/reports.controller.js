const db = require('../../config/database');

// ✅ FUNÇÃO FORA DA CLASSE
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
      console.log('📊 ===== INICIANDO DASHBOARD =====');
      const hoje = new Date().toISOString().split('T')[0];
      console.log('📅 Data de hoje:', hoje);

      // 1. PRESENTES CLT
      console.log('1️⃣ Buscando presentes CLT...');
      const presentesCLT = await db.query(`
        SELECT COUNT(DISTINCT user_id) as total
        FROM time_records
        WHERE DATE(timestamp) = $1
        AND record_type = 'entrada'
      `, [hoje]);
      console.log('✅ CLT presentes:', presentesCLT.rows[0].total);

      // 2. PRESENTES PLANTONISTAS
      console.log('2️⃣ Buscando plantonistas...');
      const presentesPlantonistas = await db.query(`
        SELECT COUNT(DISTINCT user_id) as total
        FROM duty_shifts
        WHERE date = $1
      `, [hoje]);
      console.log('✅ Plantonistas presentes:', presentesPlantonistas.rows[0].total);

      const totalPresentes = (parseInt(presentesCLT.rows[0].total) || 0) + 
                            (parseInt(presentesPlantonistas.rows[0].total) || 0);
      console.log('👥 TOTAL PRESENTES:', totalPresentes);

      // 3. TOTAL FUNCIONÁRIOS
      console.log('3️⃣ Buscando total de funcionários...');
      const totalFuncionarios = await db.query(`
        SELECT COUNT(*) as total
        FROM users
        WHERE status = 'ativo'
      `);
      const total = parseInt(totalFuncionarios.rows[0].total) || 0;
      console.log('✅ Total funcionários:', total);

      const ausencias = Math.max(0, total - totalPresentes);
      console.log('❌ Ausências:', ausencias);

      // 4. SEM SAÍDA
      console.log('4️⃣ Buscando sem saída...');
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
      console.log('⏰ Sem saída:', semSaida.rows[0].total);

      // 5. GRÁFICO SEMANAL
      console.log('5️⃣ Montando gráfico semanal...');
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
      console.log('✅ Gráfico semanal montado');

      // 6. ATIVIDADES
      console.log('6️⃣ Buscando atividades...');
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
      console.log('✅ Atividades:', atividadesRecentes.rows.length);

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
            tempo_relativo: getTempoRelativo(row.timestamp) // ✅ SEM this
          }))
        }
      };

      console.log('✅ DASHBOARD COMPLETO!');
      console.log('📊 Stats:', {
        presentes: response.data.presentes,
        ausencias: response.data.ausencias,
        sem_saida: response.data.sem_saida,
        atividades: response.data.atividades_recentes.length
      });
      
      res.json(response);

    } catch (error) {
      console.error('❌❌❌ ERRO NO DASHBOARD ❌❌❌');
      console.error('Erro:', error.message);
      console.error('Stack:', error.stack);
      
      res.status(500).json({ 
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  }

  // ✅ NOVO: Relatório mensal individual
async getMonthlyIndividual(req, res) {
  try {
    const { userId, year, month } = req.params;
    
    console.log('📊 Gerando relatório individual:', { userId, year, month });

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
    console.error('Erro no relatório individual:', error);
    res.status(500).json({ error: error.message });
  }
}

// ✅ NOVO: Relatório mensal todos CLT
async getMonthlyCLT(req, res) {
  try {
    const { year, month } = req.params;
    
    console.log('📊 Gerando relatório CLT:', { year, month });

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
    console.error('Erro no relatório CLT:', error);
    res.status(500).json({ error: error.message });
  }
}

// ✅ NOVO: Relatório mensal todos Plantonistas
async getMonthlyPlantonistas(req, res) {
  try {
    const { year, month } = req.params;
    
    console.log('📊 Gerando relatório Plantonistas:', { year, month });

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
    console.error('Erro no relatório Plantonistas:', error);
    res.status(500).json({ error: error.message });
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
}

module.exports = new ReportsController();