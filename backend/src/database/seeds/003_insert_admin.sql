-- Inserir usuário admin padrão
-- Senha padrão: Admin@123 (DEVE SER ALTERADA NO PRIMEIRO LOGIN)
INSERT INTO users (id, matricula, cpf, nome, email, password_hash, cargo, status, data_admissao) VALUES
  (
    '99999999-9999-9999-9999-999999999999',
    'ADMIN001',
    '00000000000',
    'Administrador',
    'admin@imobiliaria.com',
    '$2a$10$YourHashedPasswordHere',
    'Administrador do Sistema',
    'ativo',
    CURRENT_DATE
  )
ON CONFLICT (matricula) DO NOTHING;

-- Atribuir role de admin
INSERT INTO user_roles (user_id, role_id) VALUES
  ('99999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

-- NOTA: A senha será gerada corretamente quando criar o usuário pela API
-- Este é apenas um usuário de exemplo para testes iniciais
