require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const poolConfig = {
    connectionString: process.env.DATABASE_URL
};

// Se tiver ssl no process.env ou se o railway for detectado
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')) {
    poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

async function runMigrations() {
    const migrationFiles = [
        'v2-external-punch.sql',
        'v3-authorized-devices.sql',
        'v4-individual-consultant-tokens.sql'
    ];

    try {
        console.log('🚀 Iniciando Migrações no Banco de Dados...');

        for (const file of migrationFiles) {
            const filePath = path.join(__dirname, 'migrations', file);
            console.log(`📄 Executando: ${file}...`);

            const sql = fs.readFileSync(filePath, 'utf8');
            await pool.query(sql);

            console.log(`✅ ${file} finalizado com sucesso.`);
        }

        console.log('\n🎉 TODAS AS MIGRAÇÕES FORAM APLICADAS!');
        process.exit(0);

    } catch (error) {
        console.error('❌ ERRO NAS MIGRAÇÕES:', error.message);
        process.exit(1);
    }
}

runMigrations();
