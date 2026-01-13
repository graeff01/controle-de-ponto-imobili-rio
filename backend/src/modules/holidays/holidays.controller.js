const holidaysService = require('./holidays.service');

class HolidaysController {

    async create(req, res, next) {
        try {
            const { date, name, type, recurrence } = req.body;

            if (!date || !name) {
                return res.status(400).json({ error: 'Data e nome são obrigatórios' });
            }

            const holiday = await holidaysService.create(req.body, req.userId);

            res.status(201).json({
                success: true,
                data: holiday
            });

        } catch (error) {
            next(error);
        }
    }

    async getAll(req, res, next) {
        try {
            const { year } = req.query;
            const holidays = await holidaysService.getAll(year);

            res.json({
                success: true,
                data: holidays
            });

        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;
            await holidaysService.delete(id);

            res.json({
                success: true,
                message: 'Feriado removido com sucesso'
            });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new HolidaysController();
