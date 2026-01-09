-- Tabela de alertas do sistema
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  
  -- Status
  status VARCHAR(20) DEFAULT 'unread',
  resolved_by UUID,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);

-- Comentários
COMMENT ON TABLE alerts IS 'Alertas e notificações do sistema';
COMMENT ON COLUMN alerts.alert_type IS 'Tipos: jornada_incompleta, excesso_horas, tentativa_suspeita, etc';
COMMENT ON COLUMN alerts.severity IS 'Níveis: info, warning, error, critical';
COMMENT ON COLUMN alerts.status IS 'Status: unread, read, resolved, dismissed';
