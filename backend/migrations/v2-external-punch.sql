-- Migração para suporte a Ponto Externo e Auditoria de Localização
-- Rodar em PRD

ALTER TABLE time_adjustments 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS photo_data TEXT;

ALTER TABLE time_records 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Log de Auditoria para o Job Semanal (se não existir)
CREATE TABLE IF NOT EXISTS system_jobs_log (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    details JSONB,
    executed_at TIMESTAMP DEFAULT NOW()
);
