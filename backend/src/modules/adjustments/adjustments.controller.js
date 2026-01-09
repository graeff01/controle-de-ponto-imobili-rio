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
        endDate: req.query.endDate
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
}

module.exports = new AdjustmentsController();
