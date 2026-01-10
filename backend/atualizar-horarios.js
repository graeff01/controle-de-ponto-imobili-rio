require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function atualizarHorarios() {
  try {
    console.log('⏰ Atualizando horários de trabalho...\n');

    // Atualizar todos os usuários para 8h-18h (10h de trabalho - 1h intervalo = 9h)
    await pool.query(`
      UPDATE users
      SET work_hours_start = '08:00:00',
          work_hours_end = '18:00:00',
          expected_daily_hours = 9
      WHERE status = 'ativo'
    `);

    console.log('✅ Horários atualizados: 8h-18h (9h de trabalho)\n');
    
    // Verificar
    const result = await pool.query(`
      SELECT nome, work_hours_start, work_hours_end, expected_daily_hours 
      FROM users 
      WHERE status = 'ativo'
    `);
    
    console.log('📋 Funcionários atualizados:');
    result.rows.forEach(u => {
      console.log(`   ${u.nome}: ${u.work_hours_start} - ${u.work_hours_end} (${u.expected_daily_hours}h)`);
    });
    
    console.log('\n🎉 Concluído!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

atualizarHorarios();