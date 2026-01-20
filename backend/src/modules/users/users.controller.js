const db = require('../../config/database');
const bcrypt = require('bcrypt');
const logger = require('../../utils/logger');

class UsersController {

  // ✅ Buscar próxima matrícula
  async getNextMatricula(req, res) {
    try {
      const result = await db.query(`
        SELECT matricula 
        FROM users 
        WHERE matricula ~ '^[0-9]+$'
        ORDER BY CAST(matricula AS INTEGER) DESC 
        LIMIT 1
      `);

      let nextMatricula;
      if (result.rows.length === 0) {
        nextMatricula = '000001';
      } else {
        const lastMatricula = parseInt(result.rows[0].matricula);
        nextMatricula = String(lastMatricula + 1).padStart(6, '0');
      }

      res.json({ success: true, data: nextMatricula });
    } catch (error) {
      logger.error('Erro ao gerar próxima matrícula', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ Buscar próxima matrícula de corretor
  async getNextBrokerMatricula(req, res) {
    try {
      const result = await db.query(`
        SELECT matricula 
        FROM users 
        WHERE matricula ~ '^CORR[0-9]+$'
        ORDER BY CAST(SUBSTRING(matricula FROM 5) AS INTEGER) DESC 
        LIMIT 1
      `);

      let nextMatricula;
      if (result.rows.length === 0) {
        nextMatricula = 'CORR001';
      } else {
        const lastMatricula = result.rows[0].matricula;
        const lastNumber = parseInt(lastMatricula.replace('CORR', ''));
        nextMatricula = 'CORR' + String(lastNumber + 1).padStart(3, '0');
      }

      res.json({ success: true, data: nextMatricula });
    } catch (error) {
      logger.error('Erro ao gerar próxima matrícula de corretor', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ Buscar próxima matrícula de admin
  async getNextAdminMatricula(req, res) {
    try {
      const result = await db.query(`
        SELECT matricula 
        FROM users 
        WHERE matricula ~ '^ADMIN[0-9]+$'
        ORDER BY CAST(SUBSTRING(matricula FROM 6) AS INTEGER) DESC 
        LIMIT 1
      `);

      let nextMatricula;
      if (result.rows.length === 0) {
        nextMatricula = 'ADMIN001';
      } else {
        const lastMatricula = result.rows[0].matricula;
        const lastNumber = parseInt(lastMatricula.replace('ADMIN', ''));
        nextMatricula = 'ADMIN' + String(lastNumber + 1).padStart(3, '0');
      }

      res.json({ success: true, data: nextMatricula });
    } catch (error) {
      logger.error('Erro ao gerar próxima matrícula de admin', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ Buscar próxima matrícula de gestor
  async getNextManagerMatricula(req, res) {
    try {
      const result = await db.query(`
        SELECT matricula 
        FROM users 
        WHERE matricula ~ '^GESTOR[0-9]+$'
        ORDER BY CAST(SUBSTRING(matricula FROM 7) AS INTEGER) DESC 
        LIMIT 1
      `);

      let nextMatricula;
      if (result.rows.length === 0) {
        nextMatricula = 'GESTOR001';
      } else {
        const lastMatricula = result.rows[0].matricula;
        const lastNumber = parseInt(lastMatricula.replace('GESTOR', ''));
        nextMatricula = 'GESTOR' + String(lastNumber + 1).padStart(3, '0');
      }

      res.json({ success: true, data: nextMatricula });
    } catch (error) {
      logger.error('Erro ao gerar próxima matrícula de gestor', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ Listar todos os usuários
  async getAll(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          id, 
          matricula, 
          nome, 
          email,
          cargo, 
          departamento, 
          role,
          status,
          work_hours_start,
          work_hours_end,
          expected_daily_hours,
          user_type,
          is_duty_shift_only,
          created_at
        FROM users
        WHERE status != 'deleted'
        ORDER BY is_duty_shift_only ASC, nome ASC
      `);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      logger.error('Erro ao listar usuários', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ Buscar por matrícula
  async getByMatricula(req, res) {
    try {
      const { matricula } = req.params;

      const result = await db.query(`
      SELECT 
        id, 
        matricula, 
        nome, 
        cargo, 
        departamento, 
        role,
        is_duty_shift_only,
        user_type,
        terms_accepted_at
      FROM users 
      WHERE matricula = $1 AND status = 'ativo'
    `, [matricula]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Erro ao buscar usuário por matrícula', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ Criar novo usuário
  async create(req, res) {
    try {
      const {
        matricula, nome, cargo, departamento,
        role, email, password,
        work_hours_start, work_hours_end, expected_daily_hours,
        user_type, is_duty_shift_only
      } = req.body;

      // Validações básicas
      if (!matricula || !nome) {
        return res.status(400).json({ error: 'Matrícula e nome são obrigatórios' });
      }

      // ✅ Validação de matrícula: Aceita números, CORR, ADMIN ou GESTOR
      if (!/^(\d+|CORR\d+|ADMIN\d+|GESTOR\d+)$/.test(matricula)) {
        return res.status(400).json({
          error: 'Matrícula inválida. Use formato numérico (000001), CORR (CORR001), ADMIN (ADMIN001) ou GESTOR (GESTOR001)'
        });
      }

      // Se for admin ou gestor, email e senha são obrigatórios
      if ((role === 'admin' || role === 'manager') && (!email || !password)) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios para administradores e gestores' });
      }

      // Verificar se matrícula já existe
      const checkMatricula = await db.query(
        'SELECT id FROM users WHERE matricula = $1',
        [matricula]
      );

      if (checkMatricula.rows.length > 0) {
        return res.status(400).json({ error: 'Matrícula já cadastrada' });
      }

      // Verificar se email já existe (se fornecido)
      if (email) {
        const checkEmail = await db.query(
          'SELECT id FROM users WHERE email = $1',
          [email]
        );

        if (checkEmail.rows.length > 0) {
          return res.status(400).json({ error: 'Email já cadastrado' });
        }
      }

      // Hash da senha (se fornecida)
      let passwordHash = null;
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      // Inserir usuário
      const result = await db.query(`
        INSERT INTO users (
          matricula,
          nome,
          email,
          password_hash,
          cargo,
          departamento,
          role,
          work_hours_start,
          work_hours_end,
          expected_daily_hours,
          user_type,
          is_duty_shift_only,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ativo', NOW())
        RETURNING id, matricula, nome, email, cargo, departamento, role, user_type, is_duty_shift_only
      `, [
        matricula,
        nome,
        email || null,
        passwordHash,
        cargo || null,
        departamento || null,
        role || 'employee',
        work_hours_start || '08:00',
        work_hours_end || '18:00',
        expected_daily_hours || 9,
        user_type || 'employee',
        is_duty_shift_only || false
      ]);

      logger.info('Usuário criado', { user_id: result.rows[0].id, matricula });

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Erro ao criar usuário', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ Atualizar usuário
  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        nome, cargo, departamento,
        role, email, password,
        work_hours_start, work_hours_end, expected_daily_hours,
        user_type, is_duty_shift_only
      } = req.body;

      // Verificar se usuário existe
      const userCheck = await db.query(
        'SELECT id, email FROM users WHERE id = $1',
        [id]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Se está mudando para admin/gestor e não tem email, validar
      if ((role === 'admin' || role === 'manager') && !email && !userCheck.rows[0].email) {
        return res.status(400).json({
          error: 'Email é obrigatório para administradores e gestores'
        });
      }

      // Verificar se email já está em uso (se mudou)
      if (email && email !== userCheck.rows[0].email) {
        const emailCheck = await db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, id]
        );

        if (emailCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Email já está em uso' });
        }
      }

      // Construir query de atualização dinamicamente
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (nome) {
        updates.push(`nome = $${paramCount}`);
        values.push(nome);
        paramCount++;
      }

      if (email !== undefined) {
        updates.push(`email = $${paramCount}`);
        values.push(email || null);
        paramCount++;
      }

      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        updates.push(`password_hash = $${paramCount}`);
        values.push(passwordHash);
        paramCount++;
      }

      if (cargo !== undefined) {
        updates.push(`cargo = $${paramCount}`);
        values.push(cargo);
        paramCount++;
      }

      if (departamento !== undefined) {
        updates.push(`departamento = $${paramCount}`);
        values.push(departamento);
        paramCount++;
      }

      if (role) {
        updates.push(`role = $${paramCount}`);
        values.push(role);
        paramCount++;
      }

      if (work_hours_start) {
        updates.push(`work_hours_start = $${paramCount}`);
        values.push(work_hours_start);
        paramCount++;
      }

      if (work_hours_end) {
        updates.push(`work_hours_end = $${paramCount}`);
        values.push(work_hours_end);
        paramCount++;
      }

      if (expected_daily_hours !== undefined) {
        updates.push(`expected_daily_hours = $${paramCount}`);
        values.push(expected_daily_hours);
        paramCount++;
      }

      if (user_type !== undefined) {
        updates.push(`user_type = $${paramCount}`);
        values.push(user_type);
        paramCount++;
      }

      if (is_duty_shift_only !== undefined) {
        updates.push(`is_duty_shift_only = $${paramCount}`);
        values.push(is_duty_shift_only);
        paramCount++;
      }

      updates.push(`updated_at = NOW()`);

      values.push(id);

      const query = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, matricula, nome, email, cargo, departamento, role, user_type, is_duty_shift_only
      `;

      const result = await db.query(query, values);

      logger.info('Usuário atualizado', { user_id: id });

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Erro ao atualizar usuário', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ Desativar usuário
  async deactivate(req, res) {
    try {
      const { id } = req.params;

      await db.query(
        'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
        ['inativo', id]
      );

      logger.info('Usuário desativado', { user_id: id });

      res.json({ success: true, message: 'Usuário desativado com sucesso' });
    } catch (error) {
      logger.error('Erro ao desativar usuário', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ Excluir usuário (Soft delete)
  async delete(req, res) {
    try {
      const { id } = req.params;

      await db.query(
        'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
        ['deleted', id]
      );

      logger.info('Usuário excluído', { user_id: id });

      res.json({ success: true, message: 'Usuário excluído com sucesso' });
    } catch (error) {
      logger.error('Erro ao excluir usuário', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ Reativar usuário
  async reactivate(req, res) {
    try {
      const { id } = req.params;

      await db.query(
        'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
        ['ativo', id]
      );

      logger.info('Usuário reativado', { user_id: id });

      res.json({ success: true, message: 'Usuário reativado com sucesso' });
    } catch (error) {
      logger.error('Erro ao reativar usuário', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ Aceitar termos de uso
  async acceptTerms(req, res) {
    try {
      const { id } = req.params;

      await db.query(
        'UPDATE users SET terms_accepted_at = NOW(), updated_at = NOW() WHERE id = $1',
        [id]
      );

      logger.info('Termos de uso aceitos', { user_id: id });

      res.json({ success: true, message: 'Termos de uso aceitos com sucesso' });
    } catch (error) {
      logger.error('Erro ao aceitar termos de uso', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new UsersController();