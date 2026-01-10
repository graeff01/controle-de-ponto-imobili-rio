import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // certifique-se que DATABASE_URL está no .env
});

async function run() {
  const hash = '$2a$10$Wis.TCG.vsqHXJttUMiXuuKudTraghRd2Sl5gKRpo8mmsAa5Ztbh6';
  const matricula = 'ADMIN001';
  
  try {
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE matricula = $2',
      [hash, matricula]
    );
    console.log('Senha do admin atualizada com sucesso!');
    await pool.end();
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
}

run();
