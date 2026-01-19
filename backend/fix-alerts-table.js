require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

async function atualizarTabelaAlerts() {
  try {
    console.log('📋 Atualizando estrutura da tabela alerts...\n');

    // Adiciona colunas que estão faltando
    await pool.query(`
      -- Adiciona coluna severity se não existe
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE alerts ADD COLUMN severity VARCHAR(20) DEFAULT 'info';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'Coluna severity já existe';
        END;
      END $$;

      -- Adiciona coluna resolved_by se não existe  
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE alerts ADD COLUMN resolved_by UUID REFERENCES users(id);
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'Coluna resolved_by já existe';
        END;
      END $$;

      -- Adiciona coluna resolved_at se não existe
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE alerts ADD COLUMN resolved_at TIMESTAMP;
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'Coluna resolved_at já existe';
        END;
      END $$;

      -- Adiciona coluna resolution_notes se não existe
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE alerts ADD COLUMN resolution_notes TEXT;
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'Coluna resolution_notes já existe';
        END;
      END $$;

      -- Cria índices se não existem
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_alerts_resolved_by ON alerts(resolved_by);
    `);

    console.log('✅ Estrutura da tabela alerts atualizada com sucesso!\n');
    
    // Testa a query do service
    console.log('🔍 Testando query do AlertsService...');
    const testResult = await pool.query(`
      SELECT a.*, u.nome as user_name, u.matricula
      FROM alerts a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
      ORDER BY a.created_at DESC LIMIT 1
    `);
    
    console.log(`✅ Query executada com sucesso! Encontrados ${testResult.rows.length} registros.\n`);
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

atualizarTabelaAlerts();