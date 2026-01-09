-- Tabela de logs de auditoria (IMUTÁVEL)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  user_id UUID,
  target_user_id UUID,
  
  description TEXT NOT NULL,
  details JSONB,
  
  -- Contexto técnico
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Comentários
COMMENT ON TABLE audit_logs IS 'Logs imutáveis de auditoria do sistema';
COMMENT ON COLUMN audit_logs.event_type IS 'Exemplos: user_login, time_record_created, adjustment_made';
