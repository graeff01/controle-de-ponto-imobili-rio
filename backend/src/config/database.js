const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.on('connect', async (client) => {
  const res = await client.query(
    'SELECT current_user, current_database(), current_schema();'
  );
  console.log('🟢 Conectado como:', res.rows[0]);
});

module.exports = pool;
