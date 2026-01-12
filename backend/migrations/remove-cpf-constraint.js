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
    console.log('🔄 Iniciando migration: remove-cpf-constraint...');
    console.log('📡 Conectando ao banco:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]);

    // 1. Remover constraint NOT NULL da coluna CPF
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN cpf DROP NOT NULL
    `);
    console.log('✅ Constraint NOT NULL removida da coluna CPF');

    // 2. Opcional: Definir CPF como NULL para registros existentes sem CPF
    await client.query(`
      UPDATE users 
      SET cpf = NULL 
      WHERE cpf = '' OR cpf = 'N/A'
    `);
    console.log('✅ CPFs vazios convertidos para NULL');

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