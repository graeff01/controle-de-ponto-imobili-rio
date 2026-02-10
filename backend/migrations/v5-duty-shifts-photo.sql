-- Migration v5: Adicionar coluna photo_data na tabela duty_shifts
-- Para armazenar fotos dos plantonistas no momento do registro de presença

ALTER TABLE duty_shifts ADD COLUMN IF NOT EXISTS photo_data TEXT;
