-- ARQUIVO COMPLETO DE SETUP DO BANCO

-- Limpar tudo primeiro
DROP TABLE IF EXISTS time_records CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Criar tabela users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula VARCHAR(20) UNIQUE NOT NULL,
  cpf VARCHAR(11) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  cargo VARCHAR(100),
  status VARCHAR(20) DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela user_roles
CREATE TABLE user_roles (
  user_id UUID,
  role_id UUID,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Criar tabela time_records
CREATE TABLE time_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  record_type VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Inserir roles
INSERT INTO roles (id, nome) VALUES 
('11111111-1111-1111-1111-111111111111', 'funcionario'), 
('22222222-2222-2222-2222-222222222222', 'gestor'), 
('33333333-3333-3333-3333-333333333333', 'admin');

-- Inserir admin
INSERT INTO users (id, matricula, cpf, nome, email, password_hash, cargo, status) VALUES 
('99999999-9999-9999-9999-999999999999', 'ADMIN001', '00000000000', 'Admin', 'admin@email.com', '$2a$10$YfK3zqJ0xVJX9bKH8LVmVOqGXRjN7QbGvF8wZQqXJRxJ5KbZqXYXO', 'Admin', 'ativo');

-- Atribuir role admin
INSERT INTO user_roles (user_id, role_id) VALUES 
('99999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333');