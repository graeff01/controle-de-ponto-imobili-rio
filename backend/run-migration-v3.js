const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Conectando ao banco de dados...');
    const client = await pool.connect();

    console.log('📄 Lendo migration v3-external-punch-requests.sql...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'v3-external-punch-requests.sql'),
      'utf8'
    );

    console.log('⚙️ Executando migration...');
    await client.query(migrationSQL);

    console.log('✅ Migration executada com sucesso!');

    // Verificar se a tabela foi criada
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'external_punch_requests'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Tabela external_punch_requests criada com sucesso!');
    } else {
      console.log('❌ Tabela não foi criada');
    }

    client.release();
    await pool.end();

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    process.exit(1);
  }
}

runMigration();
