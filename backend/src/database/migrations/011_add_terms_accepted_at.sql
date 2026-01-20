-- Adicionar coluna de aceite de termos
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;

COMMENT ON COLUMN users.terms_accepted_at IS 'Data e hora em que o usuário aceitou os termos de uso e privacidade';
