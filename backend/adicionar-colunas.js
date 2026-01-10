require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function adicionarColunas() {
  try {
    console.log('🚀 Adicionando colunas faltantes...\n');

    // Adicionar colunas em time_records
    await pool.query(`
      ALTER TABLE time_records
      ADD COLUMN IF NOT EXISTS photo_data BYTEA,
      ADD COLUMN IF NOT EXISTS photo_captured_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS ip_address INET,
      ADD COLUMN IF NOT EXISTS user_agent TEXT,
      ADD COLUMN IF NOT EXISTS device_info JSONB,
      ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS manual_reason TEXT,
      ADD COLUMN IF NOT EXISTS registered_by UUID
    `);
    console.log('✅ Colunas adicionadas em time_records');

    // Adicionar foreign key
    await pool.query(`
      ALTER TABLE time_records
      ADD CONSTRAINT fk_registered_by 
      FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL
    `).catch(err => {
      if (!err.message.includes('already exists')) {
        throw err;
      }
    });
    console.log('✅ Foreign key adicionada');

    // Adicionar colunas em users
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS departamento VARCHAR(100),
      ADD COLUMN IF NOT EXISTS data_admissao DATE,
      ADD COLUMN IF NOT EXISTS data_demissao DATE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);
    console.log('✅ Colunas adicionadas em users');

    console.log('\n🎉 TODAS AS COLUNAS ADICIONADAS COM SUCESSO!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

adicionarColunas();