/**
 * Migration: Adicionar coluna integrity_hash à tabela terms_acceptances
 * Hash SHA-256 do PDF gerado para prova de integridade
 */
const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:FFIOZMVubGaENtsCFptHbuWihhlxTqPS@centerbeam.proxy.rlwy.net:49679/railway';

async function run() {
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    await pool.query(`
      ALTER TABLE terms_acceptances
      ADD COLUMN IF NOT EXISTS integrity_hash VARCHAR(64)
    `);
    console.log('Coluna integrity_hash adicionada');

    const cols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'terms_acceptances'
      ORDER BY ordinal_position
    `);
    console.log('\nEstrutura terms_acceptances:');
    cols.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pool.end();
  }
}

run();
