/**
 * Script debug para listar tabelas
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function listTables() {
    try {
        const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('Tabelas encontradas:', res.rows.map(r => r.table_name));
    } catch (err) {
        console.error(err);
    }
    await pool.end();
}

listTables();
