-- Tabela de registros de ponto
CREATE TABLE IF NOT EXISTS time_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  record_type VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  
  -- Foto capturada
  photo_data BYTEA,
  photo_captured_at TIMESTAMP,
  
  -- Contexto de segurança
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  
  -- Metadados
  is_manual BOOLEAN DEFAULT FALSE,
  manual_reason TEXT,
  registered_by UUID,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (registered_by) REFERENCES users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_time_records_user ON time_records(user_id);
CREATE INDEX IF NOT EXISTS idx_time_records_date ON time_records(DATE(timestamp));
CREATE INDEX IF NOT EXISTS idx_time_records_user_date ON time_records(user_id, DATE(timestamp));
CREATE INDEX IF NOT EXISTS idx_time_records_type ON time_records(record_type);

-- Constraint: Não pode ter dois registros idênticos no mesmo minuto
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_record 
ON time_records(user_id, record_type, DATE_TRUNC('minute', timestamp));

-- Comentários
COMMENT ON TABLE time_records IS 'Registros de ponto dos funcionários';
COMMENT ON COLUMN time_records.record_type IS 'Tipos: entrada, saida_intervalo, retorno_intervalo, saida_final';
COMMENT ON COLUMN time_records.photo_data IS 'Foto do funcionário no momento do registro';
