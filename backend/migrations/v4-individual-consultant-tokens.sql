-- Migração para Tokens Individuais de Consultoras
-- Rodar em PRD

-- Inserir Tokens Individuais
INSERT INTO authorized_devices (token, name, device_type) VALUES 
('JDL-ELISANGELA-2026', 'Elisangela - Mobile', 'mobile_consultant'),
('JDL-MARIAEDUARDA-2026', 'Maria Eduarda - Mobile', 'mobile_consultant'),
('JDL-ROBERTA-2026', 'Roberta - Mobile', 'mobile_consultant')
ON CONFLICT (token) DO NOTHING;

-- Opcional: Remover o token de teste genérico para forçar o uso dos individuais
-- DELETE FROM authorized_devices WHERE token = 'JDL-CONSULTORA-TESTE';

-- Log de Auditoria
INSERT INTO system_jobs_log (job_name, status, details) 
VALUES ('individual_tokens_init', 'success', '{"message": "Tokens individuais para consultoras criados"}');
