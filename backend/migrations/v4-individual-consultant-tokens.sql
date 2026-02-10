-- Migração para Tokens Individuais de Consultoras
-- Rodar em PRD

-- Tokens PRD - Consultoras Individuais
INSERT INTO authorized_devices (token, name, device_type) VALUES
('ELI-LAGO-PRD26', 'Elisangela - Mobile Consultora', 'mobile_consultant'),
('MEDU-LAGO-PRD26', 'Maria Eduarda - Mobile Consultora', 'mobile_consultant'),
('ROB-LAGO-PRD26', 'Roberta - Mobile Consultora', 'mobile_consultant')
ON CONFLICT (token) DO NOTHING;

-- Log de Auditoria
INSERT INTO system_jobs_log (job_name, status, details) 
VALUES ('individual_tokens_init', 'success', '{"message": "Tokens individuais para consultoras criados"}');
