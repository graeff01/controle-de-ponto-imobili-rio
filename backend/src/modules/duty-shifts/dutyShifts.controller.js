const dutyShiftsService = require('./dutyShifts.service');
const logger = require('../../utils/logger');

class DutyShiftsController {

  // Marcar presença (rota pública para tablet)
  async markPresence(req, res) {
    try {
      const { user_id, photo, notes } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório' });
      }

      const result = await dutyShiftsService.markPresence(user_id, photo, notes);

      res.status(201).json({
        success: true,
        message: `Presença registrada! Bem-vindo(a), ${result.user_name}`,
        data: result
      });

    } catch (error) {
      logger.error('Erro ao marcar presença', { error: error.message });
      res.status(400).json({ error: error.message });
    }
  }

  // Buscar presença de hoje (dashboard)
  async getTodayPresence(req, res) {
    try {
      const result = await dutyShiftsService.getTodayPresence();

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Erro ao buscar presença de hoje', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // Relatório mensal
  async getMonthlyReport(req, res) {
    try {
      const { year, month } = req.params;

      if (!year || !month) {
        return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
      }

      const result = await dutyShiftsService.getMonthlyReport(
        parseInt(year), 
        parseInt(month)
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Erro ao gerar relatório mensal', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // Download do relatório mensal em Excel
  async downloadMonthlyReport(req, res) {
    try {
      const { year, month } = req.params;

      if (!year || !month) {
        return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
      }

      const buffer = await dutyShiftsService.exportMonthlyReport(
        parseInt(year), 
        parseInt(month)
      );

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=plantoes-${month}-${year}.xlsx`);
      res.send(buffer);

    } catch (error) {
      logger.error('Erro ao baixar relatório', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // Histórico de plantões de um corretor
  async getBrokerShifts(req, res) {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate e endDate são obrigatórios' });
      }

      const result = await dutyShiftsService.getBrokerShifts(
        parseInt(userId),
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Erro ao buscar plantões', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  // Estatísticas de um corretor
  async getBrokerStats(req, res) {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate e endDate são obrigatórios' });
      }

      const result = await dutyShiftsService.getBrokerStats(
        parseInt(userId),
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Erro ao buscar estatísticas', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new DutyShiftsController();