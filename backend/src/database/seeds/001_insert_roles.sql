-- Inserir roles padrão do sistema
INSERT INTO roles (id, nome, descricao) VALUES
  ('11111111-1111-1111-1111-111111111111', 'funcionario', 'Funcionário comum - Pode registrar próprio ponto'),
  ('22222222-2222-2222-2222-222222222222', 'gestor', 'Gestor - Pode visualizar equipe e fazer ajustes'),
  ('33333333-3333-3333-3333-333333333333', 'admin', 'Administrador - Acesso total ao sistema')
ON CONFLICT (nome) DO NOTHING;
