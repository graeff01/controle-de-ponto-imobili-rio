-- Adicionar colunas faltantes na tabela alerts
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved_by ON alerts(resolved_by);