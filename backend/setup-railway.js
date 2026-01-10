require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setup() {
  try {
    console.log('🚀 Conectando no Railway...');

    // Limpar tudo
    await pool.query('DROP TABLE IF EXISTS time_records CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_roles CASCADE');
    await pool.query('DROP TABLE IF EXISTS roles CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('✅ Tabelas antigas removidas');

    // Criar users
    await pool.query(`
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
      )
    `);
    console.log('✅ Tabela users criada');

    // Criar roles
    await pool.query(`
      CREATE TABLE roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela roles criada');

    // Criar user_roles
    await pool.query(`
      CREATE TABLE user_roles (
        user_id UUID,
        role_id UUID,
        PRIMARY KEY (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabela user_roles criada');

    // Criar time_records
    await pool.query(`
      CREATE TABLE time_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        record_type VARCHAR(20) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabela time_records criada');

    // Inserir roles
    await pool.query(`
      INSERT INTO roles (id, nome) VALUES 
      ('11111111-1111-1111-1111-111111111111', 'funcionario'), 
      ('22222222-2222-2222-2222-222222222222', 'gestor'), 
      ('33333333-3333-3333-3333-333333333333', 'admin')
    `);
    console.log('✅ Roles inseridos');

    // Inserir admin
    await pool.query(`
      INSERT INTO users (id, matricula, cpf, nome, email, password_hash, cargo, status) VALUES 
      ('99999999-9999-9999-9999-999999999999', 'ADMIN001', '00000000000', 'Admin', 'admin@email.com', '$2a$10$YfK3zqJ0xVJX9bKH8LVmVOqGXRjN7QbGvF8wZQqXJRxJ5KbZqXYXO', 'Admin', 'ativo')
    `);
    console.log('✅ Admin criado');

    // Atribuir role
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id) VALUES 
      ('99999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333')
    `);
    console.log('✅ Role atribuído');

    console.log('\n🎉 SETUP COMPLETO!\n');
    console.log('Credenciais do Admin:');
    console.log('Matrícula: ADMIN001');
    console.log('Senha: Admin@123\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

setup();