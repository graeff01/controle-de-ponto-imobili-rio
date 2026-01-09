const reportsService = require('./reports.service');

class ReportsController {

  async getDashboard(req, res, next) {
    try {
      const stats = await reportsService.getDashboardStats();

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      next(error);
    }
  }

  async getWeekly(req, res, next) {
    try {
      const { userId } = req.query;

      const report = await reportsService.getWeeklyReport(userId);

      return res.json({
        success: true,
        data: report
      });

    } catch (error) {
      next(error);
    }
  }

  async getMonthly(req, res, next) {
    try {
      const { userId, year, month } = req.params;

      const report = await reportsService.getMonthlyReport(
        userId,
        parseInt(year),
        parseInt(month)
      );

      return res.json({
        success: true,
        data: report
      });

    } catch (error) {
      next(error);
    }
  }

  async getActivity(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 50;

      const activity = await reportsService.getActivityLog(limit);

      return res.json({
        success: true,
        data: activity
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportsController();
