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
    console.log('🔄 Iniciando migration: remove-email-constraint...');
    console.log('📡 Conectando ao banco:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]);

    // 1. Remover constraint NOT NULL da coluna EMAIL
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN email DROP NOT NULL
    `);
    console.log('✅ Constraint NOT NULL removida da coluna EMAIL');

    // 2. Remover constraint UNIQUE do email (se houver)
    // Isso permite que múltiplos usuários tenham email NULL
    await client.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'users_email_key'
        ) THEN
          ALTER TABLE users DROP CONSTRAINT users_email_key;
        END IF;
      END $$;
    `);
    console.log('✅ Constraint UNIQUE removida (se existia)');

    // 3. Adicionar UNIQUE apenas para emails NÃO NULOS
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique 
      ON users (email) 
      WHERE email IS NOT NULL
    `);
    console.log('✅ Index UNIQUE criado apenas para emails não-nulos');

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