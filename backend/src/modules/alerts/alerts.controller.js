const alertsService = require('./alerts.service');

class AlertsController {

  async getAll(req, res, next) {
    try {
      const filters = {
        userId: req.query.userId,
        status: req.query.status,
        severity: req.query.severity,
        alertType: req.query.alertType
      };

      const alerts = await alertsService.getAlerts(filters);

      return res.json({
        success: true,
        data: alerts
      });

    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;

      const alert = await alertsService.getAlertById(id);

      return res.json({
        success: true,
        data: alert
      });

    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;

      await alertsService.markAsRead(id);

      return res.json({
        success: true,
        message: 'Alerta marcado como lido'
      });

    } catch (error) {
      next(error);
    }
  }

  async resolve(req, res, next) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      if (!notes || notes.length < 10) {
        return res.status(400).json({
          error: 'Notas de resolução são obrigatórias (mínimo 10 caracteres)'
        });
      }

      await alertsService.resolveAlert(id, req.userId, notes);

      return res.json({
        success: true,
        message: 'Alerta resolvido com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }

  async dismiss(req, res, next) {
    try {
      const { id } = req.params;

      await alertsService.dismissAlert(id);

      return res.json({
        success: true,
        message: 'Alerta descartado'
      });

    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req, res, next) {
    try {
      const stats = await alertsService.getStatistics();

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AlertsController();
