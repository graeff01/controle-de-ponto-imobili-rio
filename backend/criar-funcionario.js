require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function criarFuncionario() {
  try {
    console.log('🚀 Criando funcionário de teste...');

    const hash = await bcrypt.hash('123456', 10);
    
    const result = await pool.query(`
      INSERT INTO users (matricula, cpf, nome, email, password_hash, cargo, status)
      VALUES ('FUNC001', '11111111111', 'João Silva', 'joao@teste.com', $1, 'Corretor', 'ativo')
      RETURNING id
    `, [hash]);
    
    console.log('✅ Usuário criado:', result.rows[0].id);

    await pool.query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, '11111111-1111-1111-1111-111111111111')
    `, [result.rows[0].id]);
    
    console.log('✅ Role atribuída!');
    console.log('\n📋 CREDENCIAIS:');
    console.log('Matrícula: FUNC001');
    console.log('Senha: 123456\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

criarFuncionario();