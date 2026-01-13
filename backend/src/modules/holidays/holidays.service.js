const db = require('../../config/database');
const logger = require('../../utils/logger');

class HolidaysService {

    async create(data, createdBy) {
        try {
            const { date, name, type, recurrence } = data;

            const result = await db.query(`
        INSERT INTO holidays (date, name, type, recurrence, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [date, name, type || 'nacional', recurrence || false, createdBy]);

            logger.info('Feriado criado', { id: result.rows[0].id, name });
            return result.rows[0];

        } catch (error) {
            if (error.code === '23505') { // Unique constraint
                throw new Error('Já existe um feriado nesta data');
            }
            logger.error('Erro ao criar feriado', { error: error.message });
            throw error;
        }
    }

    async getAll(year) {
        try {
            // Se ano for fornecido, busca feriados daquele ano + recorrentes
            let query = `SELECT * FROM holidays`;
            const params = [];

            if (year) {
                query += ` WHERE EXTRACT(YEAR FROM date) = $1 OR recurrence = true`;
                params.push(year);
            }

            query += ` ORDER BY EXTRACT(MONTH FROM date) ASC, EXTRACT(DAY FROM date) ASC`;

            const result = await db.query(query, params);
            return result.rows;

        } catch (error) {
            logger.error('Erro ao listar feriados', { error: error.message });
            throw error;
        }
    }

    async delete(id) {
        try {
            await db.query('DELETE FROM holidays WHERE id = $1', [id]);
            logger.info('Feriado removido', { id });
        } catch (error) {
            logger.error('Erro ao remover feriado', { error: error.message });
            throw error;
        }
    }

    async isHoliday(date) {
        try {
            // Verifica se a data específica é feriado OU se existe um feriado recorrente nesse dia/mês
            const result = await db.query(`
        SELECT * FROM holidays 
        WHERE date = $1 
        OR (recurrence = true 
            AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM $1::date)
            AND EXTRACT(DAY FROM date) = EXTRACT(DAY FROM $1::date)
        )
      `, [date]);

            return result.rows[0] || null;

        } catch (error) {
            logger.error('Erro ao verificar feriado', { error: error.message });
            return null;
        }
    }
}

module.exports = new HolidaysService();
