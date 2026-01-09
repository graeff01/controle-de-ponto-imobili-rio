const usersService = require('./users.service');
const validators = require('../../utils/validators');
const logger = require('../../utils/logger');

class UsersController {

  async create(req, res, next) {
    try {
      // Validação
      const { error } = validators.createUserSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.details.map(d => d.message)
        });
      }

      const user = await usersService.createUser(req.body, req.userId);

      return res.status(201).json({
        success: true,
        data: user
      });

    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        departamento: req.query.departamento,
        search: req.query.search
      };

      const users = await usersService.getAllUsers(filters);

      return res.json({
        success: true,
        data: users
      });

    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;

      const user = await usersService.getUserById(id);

      return res.json({
        success: true,
        data: user
      });

    } catch (error) {
      next(error);
    }
  }

  async getByMatricula(req, res, next) {
    try {
      const { matricula } = req.params;

      const user = await usersService.getUserByMatricula(matricula);

      return res.json({
        success: true,
        data: user
      });

    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;

      const user = await usersService.updateUser(id, req.body, req.userId);

      return res.json({
        success: true,
        data: user
      });

    } catch (error) {
      next(error);
    }
  }

  async assignRole(req, res, next) {
    try {
      const { id } = req.params;
      const { roleName } = req.body;

      if (!roleName) {
        return res.status(400).json({
          error: 'Nome da role é obrigatório'
        });
      }

      await usersService.assignRole(id, roleName, req.userId);

      return res.json({
        success: true,
        message: 'Role atribuída com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }

  async removeRole(req, res, next) {
    try {
      const { id } = req.params;
      const { roleName } = req.body;

      if (!roleName) {
        return res.status(400).json({
          error: 'Nome da role é obrigatório'
        });
      }

      await usersService.removeRole(id, roleName, req.userId);

      return res.json({
        success: true,
        message: 'Role removida com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }

  async deactivate(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      await usersService.deactivateUser(id, req.userId, reason);

      return res.json({
        success: true,
        message: 'Usuário desativado com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req, res, next) {
    try {
      const stats = await usersService.getStatistics();

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UsersController();
