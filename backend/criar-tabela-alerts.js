require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function criarTabelaAlerts() {
  try {
    console.log('📋 Criando tabela alerts...\n');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        alert_type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT NOW(),
        read_at TIMESTAMP,
        UNIQUE(user_id, alert_type, created_at)
      );

      CREATE INDEX IF NOT EXISTS idx_alerts_user_status ON alerts(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);
    `);

    console.log('✅ Tabela alerts criada com sucesso!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

criarTabelaAlerts();