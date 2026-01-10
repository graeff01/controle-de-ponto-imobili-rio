import fs from 'fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const sqlFile = fs.readFileSync('./src/database/seeds/003_insert_admin.sql', 'utf8');

// Quebra o SQL em múltiplas queries pelo ';'
const queries = sqlFile
  .split(';')
  .map(q => q.trim())
  .filter(q => q.length > 0);

async function runSeed() {
  try {
    for (const query of queries) {
      await pool.query(query);
    }
    console.log('Seeds executadas com sucesso!');
    await pool.end();
  } catch (err) {
    console.error('Erro na seed:', err);
    process.exit(1);
  }
}

runSeed();
