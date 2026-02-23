const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:FFIOZMVubGaENtsCFptHbuWihhlxTqPS@centerbeam.proxy.rlwy.net:49679/railway',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Iniciando migration: add-photo-to-duty-shifts...');
    console.log('📡 Conectando ao Railway...');

    await client.connect();
    console.log('✅ Conectado!');

    // Adicionar coluna photo
    await client.query(`
      ALTER TABLE duty_shifts 
      ADD COLUMN IF NOT EXISTS photo TEXT;
    `);
    
    console.log('✅ Coluna photo adicionada em duty_shifts');

    // Adicionar comentário
    await client.query(`
      COMMENT ON COLUMN duty_shifts.photo IS 'Foto em base64 do plantonista';
    `);

    console.log('✅ Comentário adicionado');
    console.log('🎉 Migration concluída com sucesso!');

    await client.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro na migration:', error.message);
    await client.end();
    process.exit(1);
  }
}

migrate();