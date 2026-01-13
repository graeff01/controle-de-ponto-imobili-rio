-- ============================================
-- MIGRATION: Adicionar Índices para Performance
-- ============================================
-- Execute este script no PostgreSQL para melhorar
-- a performance de consultas frequentes.
-- ============================================

-- Índices para tabela time_records (consultas mais frequentes)
CREATE INDEX IF NOT EXISTS idx_time_records_user_date 
ON time_records (user_id, DATE(timestamp));

CREATE INDEX IF NOT EXISTS idx_time_records_date 
ON time_records (DATE(timestamp));

CREATE INDEX IF NOT EXISTS idx_time_records_record_type 
ON time_records (record_type);

CREATE INDEX IF NOT EXISTS idx_time_records_timestamp 
ON time_records (timestamp DESC);

-- Índices para tabela users
CREATE INDEX IF NOT EXISTS idx_users_matricula 
ON users (matricula);

CREATE INDEX IF NOT EXISTS idx_users_status 
ON users (status);

CREATE INDEX IF NOT EXISTS idx_users_type 
ON users (is_duty_shift_only);

-- Índices para tabela duty_shifts (plantonistas)
CREATE INDEX IF NOT EXISTS idx_duty_shifts_user_date 
ON duty_shifts (user_id, date);

CREATE INDEX IF NOT EXISTS idx_duty_shifts_date 
ON duty_shifts (date);

-- Índices para tabela hours_bank
CREATE INDEX IF NOT EXISTS idx_hours_bank_user_date 
ON hours_bank (user_id, date);

CREATE INDEX IF NOT EXISTS idx_hours_bank_date_range 
ON hours_bank (date, user_id);

-- Índices para tabela alerts
CREATE INDEX IF NOT EXISTS idx_alerts_user_status 
ON alerts (user_id, status);

CREATE INDEX IF NOT EXISTS idx_alerts_type 
ON alerts (alert_type);

-- Índices para tabela audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_user_date 
ON audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_table 
ON audit_logs (table_name, record_id);

-- ============================================
-- ANALYZE para atualizar estatísticas do planner
-- ============================================
ANALYZE time_records;
ANALYZE users;
ANALYZE duty_shifts;
ANALYZE hours_bank;
ANALYZE alerts;
ANALYZE audit_logs;
