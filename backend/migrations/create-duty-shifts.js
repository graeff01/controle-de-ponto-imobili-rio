// ✅ CARREGAR .env ANTES DE TUDO
require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migration: create-duty-shifts...');
    console.log('📡 Conectando ao banco:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]);

    // 1. Adicionar colunas em users para controle de tipo
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'employee',
      ADD COLUMN IF NOT EXISTS is_duty_shift_only BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ Colunas user_type e is_duty_shift_only adicionadas em users');

    // 2. Criar tabela de plantões
    await client.query(`
      CREATE TABLE IF NOT EXISTS duty_shifts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        check_in_time TIMESTAMP NOT NULL DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        
        CONSTRAINT unique_daily_shift UNIQUE(user_id, date)
      )
    `);
    console.log('✅ Tabela duty_shifts criada');

    // 3. Criar índices para performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_duty_shifts_user ON duty_shifts(user_id);
      CREATE INDEX IF NOT EXISTS idx_duty_shifts_date ON duty_shifts(date);
      CREATE INDEX IF NOT EXISTS idx_duty_shifts_user_date ON duty_shifts(user_id, date);
    `);
    console.log('✅ Índices criados');

    // 4. Adicionar comentários
    await client.query(`
      COMMENT ON TABLE duty_shifts IS 'Registro de presença de corretores em plantões';
      COMMENT ON COLUMN users.user_type IS 'Tipo: employee (CLT) ou broker (PJ)';
      COMMENT ON COLUMN users.is_duty_shift_only IS 'TRUE para corretores que só marcam presença';
    `);
    console.log('✅ Comentários adicionados');

    console.log('🎉 Migration concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migration:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

runMigration().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});