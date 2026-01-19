require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function criarUsuariosTablet() {
  try {
    console.log('🚀 Criando usuários para teste do tablet...\n');

    const hash = await bcrypt.hash('123456', 10);
    
    // Usuários para teste do tablet
    const usuarios = [
      { matricula: '000001', nome: 'Funcionário 001', email: 'func001@teste.com', cargo: 'Funcionário' },
      { matricula: '000002', nome: 'Funcionário 002', email: 'func002@teste.com', cargo: 'Funcionário' },
      { matricula: 'CORR001', nome: 'Corretor 001', email: 'corr001@teste.com', cargo: 'Corretor' },
      { matricula: 'GESTOR001', nome: 'Gestor 001', email: 'gest001@teste.com', cargo: 'Gestor' }
    ];
    
    for (const usuario of usuarios) {
      try {
        const result = await pool.query(`
          INSERT INTO users (matricula, cpf, nome, email, password_hash, cargo, departamento, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'Geral', 'ativo')
          ON CONFLICT (matricula) DO NOTHING
          RETURNING id, matricula
        `, [
          usuario.matricula, 
          `${Math.random().toString().slice(2, 13)}`, // CPF aleatório
          usuario.nome, 
          usuario.email, 
          hash, 
          usuario.cargo
        ]);
        
        if (result.rows.length > 0) {
          console.log(`✅ Usuário criado: ${usuario.matricula} - ${usuario.nome}`);
        } else {
          console.log(`ℹ️ Usuário já existe: ${usuario.matricula}`);
        }
        
      } catch (userError) {
        console.log(`⚠️ Erro ao criar ${usuario.matricula}:`, userError.message);
      }
    }

    console.log('\n📋 CREDENCIAIS PARA TESTE:');
    console.log('Matrículas: 000001, 000002, CORR001, GESTOR001');
    console.log('Todas com senha: 123456');
    console.log('\n🎯 Agora teste o tablet com essas matrículas!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

criarUsuariosTablet();