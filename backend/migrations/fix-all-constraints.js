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
    console.log('🔄 Iniciando migration: fix-all-constraints...');
    console.log('📡 Conectando ao banco:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]);

    // 1. CPF - Permitir NULL
    await client.query(`ALTER TABLE users ALTER COLUMN cpf DROP NOT NULL`);
    console.log('✅ CPF - constraint NOT NULL removida');

    // 2. EMAIL - Permitir NULL
    await client.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`);
    console.log('✅ EMAIL - constraint NOT NULL removida');

    // 3. PASSWORD_HASH - Permitir NULL (funcionários comuns não fazem login)
    await client.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);
    console.log('✅ PASSWORD_HASH - constraint NOT NULL removida');

    // 4. CARGO - Permitir NULL
    await client.query(`ALTER TABLE users ALTER COLUMN cargo DROP NOT NULL`);
    console.log('✅ CARGO - constraint NOT NULL removida');

    // 5. DEPARTAMENTO - Permitir NULL
    await client.query(`ALTER TABLE users ALTER COLUMN departamento DROP NOT NULL`);
    console.log('✅ DEPARTAMENTO - constraint NOT NULL removida');

    // 6. Remover constraint UNIQUE do email (se houver)
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
    console.log('✅ Constraint UNIQUE do email removida');

    // 7. Adicionar UNIQUE apenas para emails NÃO NULOS
    await client.query(`
      DROP INDEX IF EXISTS users_email_unique;
      CREATE UNIQUE INDEX users_email_unique 
      ON users (email) 
      WHERE email IS NOT NULL
    `);
    console.log('✅ Index UNIQUE criado apenas para emails não-nulos');

    // 8. Limpar dados inválidos
    await client.query(`
      UPDATE users 
      SET cpf = NULL 
      WHERE cpf = '' OR cpf = 'N/A'
    `);
    console.log('✅ CPFs vazios limpos');

    console.log('');
    console.log('🎉 MIGRATION CONCLUÍDA COM SUCESSO!');
    console.log('📋 Agora você pode criar:');
    console.log('   ✓ Funcionários comuns (sem email/senha)');
    console.log('   ✓ Administradores (com email/senha)');
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro na migration:', error.message);
    console.error('📝 Detalhes:', error);
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