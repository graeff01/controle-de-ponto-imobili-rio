-- Migração para Gestão de Dispositivos Autorizados
-- Rodar em PRD

CREATE TABLE IF NOT EXISTS authorized_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) NOT NULL DEFAULT 'tablet', -- 'tablet' ou 'mobile_consultant'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Token PRD - Totem Fixo Agência
INSERT INTO authorized_devices (token, name, device_type)
VALUES ('TOTEM-LAGO-PRD26', 'Totem Fixo - Recepção Agência Jardim do Lago', 'tablet')
ON CONFLICT (token) DO NOTHING;

-- Log de Auditoria
INSERT INTO system_jobs_log (job_name, status, details) 
VALUES ('device_management_init', 'success', '{"message": "Tabela de dispositivos criada e novos tokens inseridos"}');
