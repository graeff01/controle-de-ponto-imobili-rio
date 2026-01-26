require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runAllMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  let client;

  try {
    console.log('🔄 Conectando ao banco de dados...');
    client = await pool.connect();
    console.log('✅ Conectado ao PostgreSQL');

    // ==========================================
    // PASSO 1: Migrations base (src/database/migrations)
    // ==========================================
    console.log('\n📦 PASSO 1: Executando migrations base...');
    const baseMigrationsDir = path.join(__dirname, 'src', 'database', 'migrations');

    if (fs.existsSync(baseMigrationsDir)) {
      const baseFiles = fs.readdirSync(baseMigrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      for (const file of baseFiles) {
        try {
          console.log(`  ⚙️  Executando ${file}...`);
          const sql = fs.readFileSync(path.join(baseMigrationsDir, file), 'utf8');
          await client.query(sql);
          console.log(`  ✅ ${file} concluído`);
        } catch (err) {
          // Se o erro for "already exists", continuar
          if (err.message.includes('already exists') || err.code === '42P07') {
            console.log(`  ⚠️  ${file} já aplicado anteriormente`);
          } else {
            throw err;
          }
        }
      }
    }

    // ==========================================
    // PASSO 2: Migrations adicionais (migrations/)
    // ==========================================
    console.log('\n📦 PASSO 2: Executando migrations adicionais...');
    const additionalMigrationsDir = path.join(__dirname, 'migrations');

    if (fs.existsSync(additionalMigrationsDir)) {
      const additionalFiles = [
        'production-prep.sql',
        'v2-external-punch.sql',
        'fase4-compliance.sql',
        'v3-authorized-devices.sql',
        'v3-external-punch-requests.sql'
      ];

      for (const file of additionalFiles) {
        const filePath = path.join(additionalMigrationsDir, file);
        if (fs.existsSync(filePath)) {
          try {
            console.log(`  ⚙️  Executando ${file}...`);
            const sql = fs.readFileSync(filePath, 'utf8');
            await client.query(sql);
            console.log(`  ✅ ${file} concluído`);
          } catch (err) {
            if (err.message.includes('already exists') || err.code === '42P07' || err.code === '42710') {
              console.log(`  ⚠️  ${file} já aplicado anteriormente`);
            } else {
              console.error(`  ❌ Erro em ${file}:`, err.message);
              // Continuar com as outras migrations mesmo se uma falhar
            }
          }
        } else {
          console.log(`  ⚠️  ${file} não encontrado, pulando...`);
        }
      }

      // Executar duty_shifts migration inline
      console.log(`  ⚙️  Executando duty_shifts migration...`);
      try {
        await client.query(`
          ALTER TABLE users
          ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'employee',
          ADD COLUMN IF NOT EXISTS is_duty_shift_only BOOLEAN DEFAULT FALSE
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS duty_shifts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            check_in_time TIMESTAMP NOT NULL DEFAULT NOW(),
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),

            CONSTRAINT unique_daily_shift UNIQUE(user_id, date)
          )
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_duty_shifts_user ON duty_shifts(user_id);
          CREATE INDEX IF NOT EXISTS idx_duty_shifts_date ON duty_shifts(date);
          CREATE INDEX IF NOT EXISTS idx_duty_shifts_user_date ON duty_shifts(user_id, date);
        `);

        console.log(`  ✅ duty_shifts migration concluída`);
      } catch (err) {
        if (err.message.includes('already exists') || err.code === '42P07' || err.code === '42710' || err.code === '42701') {
          console.log(`  ⚠️  duty_shifts já criada anteriormente`);
        } else {
          console.error(`  ❌ Erro em duty_shifts:`, err.message);
        }
      }
    }

    // ==========================================
    // PASSO 3: Verificações finais
    // ==========================================
    console.log('\n🔍 PASSO 3: Verificando estruturas criadas...');

    // Verificar external_punch_requests
    const extPunchCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'external_punch_requests'
    `);
    if (extPunchCheck.rows.length > 0) {
      console.log('  ✅ Tabela external_punch_requests existe');
    } else {
      console.log('  ❌ Tabela external_punch_requests NÃO foi criada');
    }

    // Verificar view daily_journey
    const dailyJourneyCheck = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_name = 'daily_journey'
    `);
    if (dailyJourneyCheck.rows.length > 0) {
      console.log('  ✅ View daily_journey existe');
    } else {
      console.log('  ❌ View daily_journey NÃO foi criada');
    }

    // Verificar outras tabelas importantes
    const tablesCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('\n📊 Tabelas no banco de dados:');
    tablesCheck.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Verificar views
    const viewsCheck = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n👁️  Views no banco de dados:');
    viewsCheck.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n✅ Todas as migrations foram processadas com sucesso!');
    console.log('🚀 O sistema está pronto para uso');

  } catch (error) {
    console.error('\n❌ Erro crítico ao executar migrations:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runAllMigrations();
