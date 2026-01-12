// ✅ CARREGAR .env ANTES DE TUDO
require('dotenv').config();

const { Pool } = require('pg');

// ✅ Criar conexão direta com DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migration: add-role-column...');
    console.log('📡 Conectando ao banco:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'DATABASE_URL não encontrada!');

    // 1. Adicionar coluna role
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'employee'
    `);
    console.log('✅ Coluna "role" adicionada');

    // 2. Atualizar usuários existentes que têm email/senha como admin
    await client.query(`
      UPDATE users 
      SET role = 'admin' 
      WHERE email IS NOT NULL 
      AND password_hash IS NOT NULL 
      AND role IS NULL
    `);
    console.log('✅ Usuários com email/senha definidos como admin');

    // 3. Garantir que os demais sejam employee
    await client.query(`
      UPDATE users 
      SET role = 'employee' 
      WHERE role IS NULL
    `);
    console.log('✅ Demais usuários definidos como employee');

    // 4. Adicionar coluna data_nascimento (opcional)
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS data_nascimento DATE
    `);
    console.log('✅ Coluna "data_nascimento" adicionada');

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