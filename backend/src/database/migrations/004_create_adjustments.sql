-- Tabela de ajustes de ponto
CREATE TABLE IF NOT EXISTS time_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_record_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Valores originais
  original_timestamp TIMESTAMP NOT NULL,
  original_type VARCHAR(20) NOT NULL,
  
  -- Valores ajustados
  adjusted_timestamp TIMESTAMP NOT NULL,
  adjusted_type VARCHAR(20) NOT NULL,
  
  -- Justificativa OBRIGATÓRIA
  reason TEXT NOT NULL,
  
  -- Quem fez o ajuste
  adjusted_by UUID NOT NULL,
  adjusted_at TIMESTAMP DEFAULT NOW(),
  
  -- Aprovação (se necessário)
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID,
  approved_at TIMESTAMP,
  approval_status VARCHAR(20),
  
  -- Notificação ao funcionário
  employee_notified BOOLEAN DEFAULT FALSE,
  employee_notified_at TIMESTAMP,
  
  FOREIGN KEY (time_record_id) REFERENCES time_records(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (adjusted_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_adjustments_record ON time_adjustments(time_record_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_user ON time_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_status ON time_adjustments(approval_status);

-- Comentários
COMMENT ON TABLE time_adjustments IS 'Ajustes realizados em registros de ponto';
COMMENT ON COLUMN time_adjustments.approval_status IS 'Status: pending, approved, rejected';
