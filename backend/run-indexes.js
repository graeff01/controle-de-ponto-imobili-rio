/**
 * Script para executar os índices de performance no banco Railway
 * Execute com: node run-indexes.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runIndexes() {
    console.log('🚀 Iniciando criação de índices de performance...\n');

    const indexes = [
        // Índices para tabela time_records
        {
            name: 'idx_time_records_user_date',
            sql: 'CREATE INDEX IF NOT EXISTS idx_time_records_user_date ON time_records (user_id, DATE(timestamp))'
        },
        {
            name: 'idx_time_records_date',
            sql: 'CREATE INDEX IF NOT EXISTS idx_time_records_date ON time_records (DATE(timestamp))'
        },
        {
            name: 'idx_time_records_record_type',
            sql: 'CREATE INDEX IF NOT EXISTS idx_time_records_record_type ON time_records (record_type)'
        },
        {
            name: 'idx_time_records_timestamp',
            sql: 'CREATE INDEX IF NOT EXISTS idx_time_records_timestamp ON time_records (timestamp DESC)'
        },

        // Índices para tabela users
        {
            name: 'idx_users_matricula',
            sql: 'CREATE INDEX IF NOT EXISTS idx_users_matricula ON users (matricula)'
        },
        {
            name: 'idx_users_status',
            sql: 'CREATE INDEX IF NOT EXISTS idx_users_status ON users (status)'
        },
        {
            name: 'idx_users_type',
            sql: 'CREATE INDEX IF NOT EXISTS idx_users_type ON users (is_duty_shift_only)'
        },

        // Índices para tabela duty_shifts
        {
            name: 'idx_duty_shifts_user_date',
            sql: 'CREATE INDEX IF NOT EXISTS idx_duty_shifts_user_date ON duty_shifts (user_id, date)'
        },
        {
            name: 'idx_duty_shifts_date',
            sql: 'CREATE INDEX IF NOT EXISTS idx_duty_shifts_date ON duty_shifts (date)'
        },

        // Índices para tabela hours_bank
        {
            name: 'idx_hours_bank_user_date',
            sql: 'CREATE INDEX IF NOT EXISTS idx_hours_bank_user_date ON hours_bank (user_id, date)'
        },
        {
            name: 'idx_hours_bank_date_range',
            sql: 'CREATE INDEX IF NOT EXISTS idx_hours_bank_date_range ON hours_bank (date, user_id)'
        },

        // Índices para tabela alerts
        {
            name: 'idx_alerts_user_status',
            sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_user_status ON alerts (user_id, status)'
        },
        {
            name: 'idx_alerts_type',
            sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts (alert_type)'
        }
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const index of indexes) {
        try {
            await pool.query(index.sql);
            console.log(`✅ ${index.name}`);
            successCount++;
        } catch (error) {
            // Ignorar erros de coluna não existente (tabela pode não ter essa coluna)
            if (error.code === '42703' || error.code === '42P01') {
                console.log(`⚠️  ${index.name} - Tabela/coluna não existe (OK)`);
            } else {
                console.log(`❌ ${index.name} - Erro: ${error.message}`);
                errorCount++;
            }
        }
    }

    // Executar ANALYZE para atualizar estatísticas
    console.log('\n📊 Atualizando estatísticas do banco...');

    const tables = ['time_records', 'users', 'duty_shifts', 'hours_bank', 'alerts'];
    for (const table of tables) {
        try {
            await pool.query(`ANALYZE ${table}`);
            console.log(`✅ ANALYZE ${table}`);
        } catch (error) {
            console.log(`⚠️  ANALYZE ${table} - ${error.message}`);
        }
    }

    console.log('\n========================================');
    console.log(`📈 Resultado: ${successCount} índices criados, ${errorCount} erros`);
    console.log('========================================\n');

    await pool.end();
    console.log('🏁 Concluído! O banco agora está otimizado.\n');
}

runIndexes().catch(err => {
    console.error('❌ Erro fatal:', err.message);
    process.exit(1);
});
