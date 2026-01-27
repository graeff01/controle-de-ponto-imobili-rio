-- Script para atualizar tokens dos dispositivos autorizados
-- Execute este script no banco de produção via Railway CLI ou pgAdmin

-- Limpar tokens antigos (opcional - comente se quiser manter histórico)
DELETE FROM authorized_devices;

-- Inserir novos dispositivos com chaves seguras
INSERT INTO authorized_devices (id, name, device_type, token, created_at)
VALUES
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Tablet Fixo - Agência Jardim do Lago',
    'tablet',
    '7c1cbc688e61e4761feac5a6689661bbdfd8a5fd5e92341d252bed1fb3812fd8',
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'Dispositivos Móveis - Consultoras',
    'mobile',
    '7141ab68d4f321796d85e53735e855b2bddcc920ee506d21c7d2d9893efc990c',
    NOW()
  )
ON CONFLICT (id) DO UPDATE
SET
  token = EXCLUDED.token,
  name = EXCLUDED.name,
  device_type = EXCLUDED.device_type,
  created_at = NOW();

-- Verificar se foram inseridos corretamente
SELECT id, name, device_type, LEFT(token, 20) || '...' as token_preview, created_at
FROM authorized_devices
ORDER BY created_at DESC;
