-- Script para redefinir COMPLETAMENTE as chaves de acesso
-- ⚠️ IMPORTANTE: Este script APAGA todas as chaves antigas e cria novas
-- Execute este script no banco de produção via Railway

-- 1️⃣ APAGAR TODAS AS CHAVES ANTIGAS (invalida todos os dispositivos)
DELETE FROM authorized_devices;

-- 2️⃣ INSERIR NOVAS CHAVES SIMPLES E FÁCEIS DE DIGITAR
INSERT INTO authorized_devices (id, name, device_type, token, created_at)
VALUES
  -- Tablet fixo da agência
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Tablet Fixo - Recepção Agência',
    'tablet',
    'TABLET-JARDIM-2026',
    NOW()
  ),
  -- Celulares das consultoras (chave compartilhada)
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'Celulares - Todas as Consultoras',
    'mobile',
    'CONSULTORA-2026',
    NOW()
  );

-- 3️⃣ VERIFICAR SE FOI APLICADO CORRETAMENTE
SELECT
  id,
  name,
  device_type,
  token,
  created_at
FROM authorized_devices
ORDER BY created_at DESC;

-- ✅ Resultado esperado: Apenas 2 registros (tablet e mobile)
