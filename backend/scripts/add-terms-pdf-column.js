/**
 * Migration: Adicionar coluna pdf_data à tabela terms_acceptances
 * Para armazenar o PDF gerado do termo assinado de forma segura
 */
const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:FFIOZMVubGaENtsCFptHbuWihhlxTqPS@centerbeam.proxy.rlwy.net:49679/railway';

async function run() {
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    // Adicionar coluna pdf_data (BYTEA comprimido)
    await pool.query(`
      ALTER TABLE terms_acceptances
      ADD COLUMN IF NOT EXISTS pdf_data BYTEA
    `);
    console.log('Coluna pdf_data adicionada à terms_acceptances');

    // Verificar estrutura final
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
