require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function adicionarColunaTermos() {
    try {
        console.log('🚀 Adicionando coluna terms_accepted_at...');

        await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;
    `);

        console.log('✅ Coluna terms_accepted_at adicionada com sucesso!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

adicionarColunaTermos();
