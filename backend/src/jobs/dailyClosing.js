const db = require('../config/database');
const logger = require('../utils/logger');
const holidaysService = require('../modules/holidays/holidays.service');

async function dailyClosing() {
    try {
        const now = new Date();
        // Ajuste para garantir que estamos processando o dia correto (rodar 23h)
        const todayDate = now.toISOString().split('T')[0];

        logger.info(`🔒 Iniciando fechamento diário do ponto: ${todayDate}`);

        // 1. Verificar se é feriado
        const holiday = await holidaysService.isHoliday(todayDate);
        const isHoliday = !!holiday;
        const isWeekend = now.getDay() === 0 || now.getDay() === 6; // 0=Dom, 6=Sab

        // 2. Buscar usuários ativos
        const users = await db.query(`
      SELECT id, nome, expected_daily_hours, is_duty_shift_only 
      FROM users 
      WHERE status = 'ativo'
    `);

        let processedCount = 0;

        for (const user of users.rows) {
            try {
                // Se for plantonista, a regra é diferente (geralmente não tem banco de horas fixo diário, 
                // ou conta tudo como positivo. Vamos assumir que plantonista não gera débito de banco de horas automático por enquanto)
                if (user.is_duty_shift_only) {
                    continue;
                }

                // 3. Determinar horas esperadas
                let hoursExpected = parseFloat(user.expected_daily_hours || 8); // Padrão 8h

                if (isHoliday || isWeekend) {
                    hoursExpected = 0;
                }

                // 4. Calcular horas trabalhadas no dia
                // Usamos a view hours_worked_daily para facilitar
                const workedResult = await db.query(`
          SELECT hours_worked 
          FROM hours_worked_daily 
          WHERE user_id = $1 AND date = $2
        `, [user.id, todayDate]);

                let hoursWorked = 0;
                if (workedResult.rows.length > 0 && workedResult.rows[0].hours_worked) {
                    hoursWorked = parseFloat(workedResult.rows[0].hours_worked);
                }

                // 5. Calcular saldo
                const balance = hoursWorked - hoursExpected;

                // 6. Persistir no Banco de Horas
                await db.query(`
          INSERT INTO hours_bank (user_id, date, hours_worked, hours_expected, balance)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, date) 
          DO UPDATE SET 
            hours_worked = $3,
            hours_expected = $4,
            balance = $5,
            updated_at = NOW()
        `, [user.id, todayDate, hoursWorked, hoursExpected, balance]);

                processedCount++;

            } catch (err) {
                logger.error(`Erro ao processar fechamento para usuário ${user.id}`, { error: err.message });
            }
        }

        logger.success(`✅ Fechamento diário concluído. Processados: ${processedCount}/${users.rows.length}`);
        if (isHoliday) logger.info(`ℹ️ Dia processado como feriado: ${holiday.name}`);

    } catch (error) {
        logger.error('Erro fatal no fechamento diário', { error: error.message });
    }
}

module.exports = dailyClosing;
