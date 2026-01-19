const express = require('express');
const db = require('../../config/database');
const logger = require('../../utils/logger');

const router = express.Router();

// Endpoint para executar migrações críticas (apenas em produção)
router.post('/migrate-alerts', async (req, res) => {
  try {
    // Verificação de segurança básica
    const adminToken = req.headers['x-admin-token'];
    if (adminToken !== process.env.ADMIN_MIGRATION_TOKEN) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    logger.info('🔧 Iniciando migração da tabela alerts...');

    // Adiciona colunas que estão faltando
    await db.query(`
      -- Adiciona coluna severity se não existe
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE alerts ADD COLUMN severity VARCHAR(20) DEFAULT 'info';
          RAISE NOTICE 'Coluna severity adicionada';
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
          RAISE NOTICE 'Coluna resolved_by adicionada';
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
          RAISE NOTICE 'Coluna resolved_at adicionada';
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
          RAISE NOTICE 'Coluna resolution_notes adicionada';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'Coluna resolution_notes já existe';
        END;
      END $$;

      -- Cria índices se não existem
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_alerts_resolved_by ON alerts(resolved_by);
    `);

    // Testa se a migração funcionou
    const testResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'alerts' 
      AND column_name IN ('severity', 'resolved_by', 'resolved_at', 'resolution_notes')
      ORDER BY column_name
    `);

    logger.success('✅ Migração da tabela alerts concluída!', {
      colunas_encontradas: testResult.rows.map(r => r.column_name)
    });

    res.json({
      success: true,
      message: 'Migração executada com sucesso',
      colunas_adicionadas: testResult.rows.map(r => r.column_name)
    });

  } catch (error) {
    logger.error('❌ Erro na migração:', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para verificar estrutura da tabela alerts
router.get('/check-alerts-structure', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'alerts' 
      ORDER BY ordinal_position
    `);

    res.json({
      success: true,
      estrutura: result.rows
    });

  } catch (error) {
    logger.error('Erro ao verificar estrutura:', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;