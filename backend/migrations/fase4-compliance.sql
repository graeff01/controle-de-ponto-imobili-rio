-- ============================================
-- MIGRATION: Fase 4 - Compliance Core
-- ============================================

-- 1. Tabela de Feriados
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'nacional', -- nacional, estadual, municipal, facultativo
  recurrence BOOLEAN DEFAULT false, -- se repete todo ano
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date) WHERE recurrence = false;
CREATE INDEX IF NOT EXISTS idx_holidays_recurrence ON holidays(recurrence);

-- 2. Tabela de Ajustes (Criar se não existir, ou adicionar colunas)
CREATE TABLE IF NOT EXISTS time_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_record_id UUID REFERENCES time_records(id),
  user_id UUID REFERENCES users(id),
  original_timestamp TIMESTAMP WITH TIME ZONE,
  original_type VARCHAR(50),
  adjusted_timestamp TIMESTAMP WITH TIME ZONE,
  adjusted_type VARCHAR(50),
  reason TEXT,
  adjusted_by UUID REFERENCES users(id),
  adjusted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas de aprovação (seguro para re-execução)
ALTER TABLE time_adjustments 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved', -- pending, approved, rejected
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_adjustments_status ON time_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_adjustments_user ON time_adjustments(user_id);

-- 3. Geolocalização nos Registros
ALTER TABLE time_records
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_accuracy DECIMAL(10, 2); -- em metros

-- 4. Assinatura Eletrônica (Prepare para Fase 6)
CREATE TABLE IF NOT EXISTS time_mirrors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, signed
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_hash VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_time_mirrors_user_period ON time_mirrors(user_id, period_start, period_end);
