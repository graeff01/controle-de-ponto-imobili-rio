-- =============================================================
-- SCRIPT DE PRODUÇÃO - Redefinição Completa de Chaves PRD
-- Data: 10/02/2026
-- =============================================================
-- ⚠️ ESTE SCRIPT APAGA TODAS AS CHAVES ANTIGAS E CRIA NOVAS
-- Execute no banco de produção via Railway Dashboard ou CLI
-- =============================================================

-- 1️⃣ APAGAR TODAS AS CHAVES E DISPOSITIVOS ANTIGOS
DELETE FROM authorized_devices;

-- 2️⃣ INSERIR NOVAS CHAVES DE PRODUÇÃO
INSERT INTO authorized_devices (id, name, device_type, token, created_at)
VALUES
  -- Tablet fixo da agência (recepção)
  (
    gen_random_uuid(),
    'Totem Fixo - Recepção Agência Jardim do Lago',
    'tablet',
    'TOTEM-LAGO-PRD26',
    NOW()
  ),
  -- Elisangela - Consultora
  (
    gen_random_uuid(),
    'Elisangela - Mobile Consultora',
    'mobile_consultant',
    'ELI-LAGO-PRD26',
    NOW()
  ),
  -- Maria Eduarda - Consultora
  (
    gen_random_uuid(),
    'Maria Eduarda - Mobile Consultora',
    'mobile_consultant',
    'MEDU-LAGO-PRD26',
    NOW()
  ),
  -- Roberta - Consultora
  (
    gen_random_uuid(),
    'Roberta - Mobile Consultora',
    'mobile_consultant',
    'ROB-LAGO-PRD26',
    NOW()
  );

-- 3️⃣ VERIFICAÇÃO - Deve retornar exatamente 4 registros
SELECT
  id,
  name,
  device_type,
  token,
  created_at
FROM authorized_devices
ORDER BY device_type, name;

-- ✅ Resultado esperado:
-- 1. Elisangela - Mobile Consultora    | mobile_consultant | ELI-LAGO-PRD26
-- 2. Maria Eduarda - Mobile Consultora | mobile_consultant | MEDU-LAGO-PRD26
-- 3. Roberta - Mobile Consultora       | mobile_consultant | ROB-LAGO-PRD26
-- 4. Totem Fixo - Recepção Agência     | tablet            | TOTEM-LAGO-PRD26
