-- Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Comentários
COMMENT ON TABLE system_config IS 'Configurações gerais do sistema';
