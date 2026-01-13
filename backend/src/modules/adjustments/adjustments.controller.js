const adjustmentsService = require('./adjustments.service');
const validators = require('../../utils/validators');

class AdjustmentsController {

  async create(req, res, next) {
    try {
      // Validação
      const { error } = validators.adjustmentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.details.map(d => d.message)
        });
      }

      const adjustment = await adjustmentsService.createAdjustment(
        req.body,
        req.userId,
        req
      );

      return res.status(201).json({
        success: true,
        data: adjustment,
        message: 'Ajuste criado com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }

  async getByUser(req, res, next) {
    try {
      const { userId } = req.params;

      const adjustments = await adjustmentsService.getAdjustmentsByUser(userId);

      return res.json({
        success: true,
        data: adjustments
      });

    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const filters = {
        userId: req.query.userId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status // Novo filtro
      };

      const adjustments = await adjustmentsService.getAllAdjustments(filters);

      return res.json({
        success: true,
        data: adjustments
      });

    } catch (error) {
      next(error);
    }
  }

  // ✅ NOVO: Aprovar Ajuste
  async approve(req, res, next) {
    try {
      const { id } = req.params;

      const adjustment = await adjustmentsService.approveAdjustment(id, req.userId, req);

      return res.json({
        success: true,
        message: 'Ajuste aprovado com sucesso',
        data: adjustment
      });

    } catch (error) {
      next(error);
    }
  }

  // ✅ NOVO: Rejeitar Ajuste
  async reject(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Motivo da rejeição é obrigatório' });
      }

      const adjustment = await adjustmentsService.rejectAdjustment(id, req.userId, reason, req);

      return res.json({
        success: true,
        message: 'Ajuste rejeitado',
        data: adjustment
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdjustmentsController();
