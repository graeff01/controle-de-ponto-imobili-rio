require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function adicionarFuncionalidades() {
  try {
    console.log('🚀 Adicionando funcionalidades críticas...\n');

    // 1. Tabela de Justificativas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS justifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        reason TEXT NOT NULL,
        document_path TEXT,
        document_name TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela justifications criada');

    // 2. Tabela de Banco de Horas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hours_bank (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        hours_worked DECIMAL(5,2) DEFAULT 0,
        hours_expected DECIMAL(5,2) DEFAULT 8,
        balance DECIMAL(5,2) GENERATED ALWAYS AS (hours_worked - hours_expected) STORED,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, date)
      )
    `);
    console.log('✅ Tabela hours_bank criada');

    // 3. Tabela de Logs de Auditoria
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(50) NOT NULL,
        table_name VARCHAR(50) NOT NULL,
        record_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela audit_logs criada');

    // 4. Adicionar horário de trabalho em users
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS work_hours_start TIME DEFAULT '08:00:00',
      ADD COLUMN IF NOT EXISTS work_hours_end TIME DEFAULT '17:00:00',
      ADD COLUMN IF NOT EXISTS expected_daily_hours DECIMAL(5,2) DEFAULT 8
    `);
    console.log('✅ Colunas de horário adicionadas em users');

    // 5. Índices para performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_time_records_user_date ON time_records(user_id, DATE(timestamp));
      CREATE INDEX IF NOT EXISTS idx_time_records_timestamp ON time_records(timestamp);
      CREATE INDEX IF NOT EXISTS idx_justifications_user_date ON justifications(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_hours_bank_user_date ON hours_bank(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
    `);
    console.log('✅ Índices criados');

    console.log('\n🎉 TODAS AS FUNCIONALIDADES ADICIONADAS COM SUCESSO!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

adicionarFuncionalidades();