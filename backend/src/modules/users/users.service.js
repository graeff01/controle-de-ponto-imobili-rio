const bcrypt = require('bcryptjs');
const db = require('../../config/database');
const logger = require('../../utils/logger');
const auditService = require('../../services/auditService');

class UsersService {

  async createUser(userData, createdBy) {
    try {
      const { matricula, cpf, nome, email, password, cargo, departamento, data_admissao } = userData;

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

      // Insere usuário
      const result = await db.query(`
        INSERT INTO users 
        (matricula, cpf, nome, email, password_hash, cargo, departamento, data_admissao, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ativo')
        RETURNING id, matricula, cpf, nome, email, cargo, departamento, status, data_admissao, created_at
      `, [matricula, cpf, nome, email, hashedPassword, cargo, departamento, data_admissao || new Date()]);

      const user = result.rows[0];

      // Atribui role padrão de funcionário
      await db.query(`
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        SELECT $1, id, $2 FROM roles WHERE nome = 'funcionario'
      `, [user.id, createdBy]);

      // Log de auditoria
      await auditService.log(
        'user_created',
        createdBy,
        user.id,
        `Usuário  criado`,
        { matricula: user.matricula, email: user.email }
      );

      logger.success('Usuário criado com sucesso', { userId: user.id, matricula });

      return user;

    } catch (error) {
      logger.error('Erro ao criar usuário', { error: error.message });
      
      if (error.code === '23505') { // Unique violation
        if (error.constraint.includes('matricula')) {
          throw new Error('Matrícula já cadastrada');
        }
        if (error.constraint.includes('cpf')) {
          throw new Error('CPF já cadastrado');
        }
        if (error.constraint.includes('email')) {
          throw new Error('Email já cadastrado');
        }
      }
      
      throw error;
    }
  }

  async getAllUsers(filters = {}) {
    try {
      let query = `
        SELECT u.id, u.matricula, u.cpf, u.nome, u.email, u.cargo, u.departamento, 
               u.status, u.data_admissao, u.created_at,
               ARRAY_AGG(r.nome) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      if (filters.status) {
        query += ` AND u.status = $`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.departamento) {
        query += ` AND u.departamento = $`;
        params.push(filters.departamento);
        paramIndex++;
      }

      if (filters.search) {
        query += ` AND (u.nome ILIKE $ OR u.matricula ILIKE $ OR u.email ILIKE $)`;
        params.push(`%%`);
        paramIndex++;
      }

      query += ` GROUP BY u.id ORDER BY u.nome ASC`;

      const result = await db.query(query, params);
      return result.rows;

    } catch (error) {
      logger.error('Erro ao buscar usuários', { error: error.message });
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const result = await db.query(`
        SELECT u.id, u.matricula, u.cpf, u.nome, u.email, u.cargo, u.departamento, 
               u.status, u.data_admissao, u.data_demissao, u.created_at, u.updated_at,
               ARRAY_AGG(r.nome) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = $1
        GROUP BY u.id
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }

      return result.rows[0];

    } catch (error) {
      logger.error('Erro ao buscar usuário', { error: error.message });
      throw error;
    }
  }

  async getUserByMatricula(matricula) {
    try {
      const result = await db.query(`
        SELECT u.id, u.matricula, u.nome, u.email, u.cargo, u.status,
               ARRAY_AGG(r.nome) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.matricula = $1
        GROUP BY u.id
      `, [matricula]);

      if (result.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }

      return result.rows[0];

    } catch (error) {
      logger.error('Erro ao buscar usuário por matrícula', { error: error.message });
      throw error;
    }
  }

  async updateUser(userId, updateData, updatedBy) {
    try {
      const { nome, email, cargo, departamento, status } = updateData;

      const result = await db.query(`
        UPDATE users 
        SET nome = COALESCE($1, nome),
            email = COALESCE($2, email),
            cargo = COALESCE($3, cargo),
            departamento = COALESCE($4, departamento),
            status = COALESCE($5, status),
            updated_at = NOW()
        WHERE id = $6
        RETURNING id, matricula, cpf, nome, email, cargo, departamento, status, updated_at
      `, [nome, email, cargo, departamento, status, userId]);

      if (result.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }

      const user = result.rows[0];

      // Log de auditoria
      await auditService.log(
        'user_updated',
        updatedBy,
        userId,
        `Usuário  atualizado`,
        updateData
      );

      logger.success('Usuário atualizado com sucesso', { userId });

      return user;

    } catch (error) {
      logger.error('Erro ao atualizar usuário', { error: error.message });
      throw error;
    }
  }

  async assignRole(userId, roleName, assignedBy) {
    try {
      // Verifica se role existe
      const roleResult = await db.query(`SELECT id FROM roles WHERE nome = $1`, [roleName]);
      
      if (roleResult.rows.length === 0) {
        throw new Error('Role não encontrada');
      }

      const roleId = roleResult.rows[0].id;

      // Atribui role
      await db.query(`
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `, [userId, roleId, assignedBy]);

      // Log de auditoria
      await auditService.log(
        'role_assigned',
        assignedBy,
        userId,
        `Role '' atribuída ao usuário`,
        { roleName }
      );

      logger.success('Role atribuída com sucesso', { userId, roleName });

      return { success: true };

    } catch (error) {
      logger.error('Erro ao atribuir role', { error: error.message });
      throw error;
    }
  }

  async removeRole(userId, roleName, removedBy) {
    try {
      await db.query(`
        DELETE FROM user_roles 
        WHERE user_id = $1 
        AND role_id = (SELECT id FROM roles WHERE nome = $2)
      `, [userId, roleName]);

      // Log de auditoria
      await auditService.log(
        'role_removed',
        removedBy,
        userId,
        `Role '' removida do usuário`,
        { roleName }
      );

      logger.success('Role removida com sucesso', { userId, roleName });

      return { success: true };

    } catch (error) {
      logger.error('Erro ao remover role', { error: error.message });
      throw error;
    }
  }

  async deactivateUser(userId, deactivatedBy, reason) {
    try {
      await db.query(`
        UPDATE users 
        SET status = 'inativo', 
            data_demissao = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = $1
      `, [userId]);

      // Log de auditoria
      await auditService.log(
        'user_deactivated',
        deactivatedBy,
        userId,
        'Usuário desativado',
        { reason }
      );

      logger.success('Usuário desativado com sucesso', { userId });

      return { success: true };

    } catch (error) {
      logger.error('Erro ao desativar usuário', { error: error.message });
      throw error;
    }
  }

  async getStatistics() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'ativo') as ativos,
          COUNT(*) FILTER (WHERE status = 'inativo') as inativos,
          COUNT(*) FILTER (WHERE status = 'afastado') as afastados,
          COUNT(*) as total
        FROM users
      `);

      return result.rows[0];

    } catch (error) {
      logger.error('Erro ao buscar estatísticas de usuários', { error: error.message });
      throw error;
    }
  }
}

module.exports = new UsersService();
