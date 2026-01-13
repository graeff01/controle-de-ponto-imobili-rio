/**
 * Script para executar migração da Fase 4
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    console.log('🚀 Iniciando migração Fase 4 (Compliance Core)...\n');

    try {
        const sqlPath = path.join(__dirname, 'migrations', 'fase4-compliance.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Executa o SQL inteiro
        await pool.query(sql);

        console.log('✅ Tabelas e colunas criadas com sucesso!');
        console.log('   - holidays (Feriados)');
        console.log('   - time_adjustments + colunas de aprovação');
        console.log('   - time_records + latitude/longitude');
        console.log('   - time_mirrors (Assinatura Eletrônica)');

    } catch (error) {
        console.error('❌ Erro na migração:', error.message);
        process.exit(1);
    }

    await pool.end();
    console.log('\n🏁 Migração concluída.\n');
}

runMigration();
