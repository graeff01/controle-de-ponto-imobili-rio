-- Migração para consolidar alterações de produção
-- Rodar antes de subir em PRD

-- 1. Tabela de Configurações
CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Termos de Uso em Usuários
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;

-- 3. Ajustes de Ponto Esquecido (Novos Registros)
ALTER TABLE time_adjustments ALTER COLUMN time_record_id DROP NOT NULL;
ALTER TABLE time_adjustments ADD COLUMN IF NOT EXISTS is_addition BOOLEAN DEFAULT FALSE;
ALTER TABLE time_adjustments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 4. Token do Tablet (Configuração Inicial)
INSERT INTO system_config (key, value, description)
VALUES ('authorized_tablet_token', '{"token": "TOTEM-LAGO-PRD26"}', 'Token de autenticação para o Totem/Tablet')
ON CONFLICT (key) DO UPDATE SET value = '{"token": "TOTEM-LAGO-PRD26"}', updated_at = NOW();

-- 5. Logs de Email (para auditoria)
CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    email_type VARCHAR(50),
    status VARCHAR(50),
    error_message TEXT,
    user_id UUID,
    related_id INTEGER,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
