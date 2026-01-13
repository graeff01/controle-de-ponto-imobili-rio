const Joi = require('joi');

/**
 * Schemas de validação centralizados usando Joi
 * Usados em todas as rotas para garantir consistência
 */

// ============================================
// VALIDAÇÕES DE USUÁRIO
// ============================================

// Validação de senha forte
const passwordSchema = Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
        'string.min': 'Senha deve ter no mínimo 8 caracteres',
        'string.max': 'Senha deve ter no máximo 128 caracteres',
        'string.pattern.base': 'Senha deve conter: letra maiúscula, minúscula, número e caractere especial (@$!%*?&)'
    });

// Validação de CPF (apenas números, 11 dígitos)
const cpfSchema = Joi.string()
    .length(11)
    .pattern(/^\d{11}$/)
    .messages({
        'string.length': 'CPF deve ter 11 dígitos',
        'string.pattern.base': 'CPF deve conter apenas números'
    });

// Validação de matrícula
const matriculaSchema = Joi.string()
    .min(3)
    .max(20)
    .pattern(/^[A-Za-z0-9]+$/)
    .messages({
        'string.min': 'Matrícula deve ter no mínimo 3 caracteres',
        'string.max': 'Matrícula deve ter no máximo 20 caracteres',
        'string.pattern.base': 'Matrícula deve conter apenas letras e números'
    });

// Schema completo de criação de usuário
const createUserSchema = Joi.object({
    matricula: matriculaSchema.required(),
    cpf: cpfSchema.required(),
    nome: Joi.string().min(3).max(255).required(),
    email: Joi.string().email().required(),
    password: passwordSchema.required(),
    cargo: Joi.string().max(100).optional(),
    departamento: Joi.string().max(100).optional(),
    status: Joi.string().valid('ativo', 'inativo').default('ativo'),
    work_hours_start: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    work_hours_end: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    expected_daily_hours: Joi.number().min(1).max(24).default(8),
    user_type: Joi.string().valid('clt', 'plantonista').optional(),
    is_duty_shift_only: Joi.boolean().default(false)
});

// Schema de atualização de usuário (campos opcionais)
const updateUserSchema = Joi.object({
    nome: Joi.string().min(3).max(255).optional(),
    email: Joi.string().email().optional(),
    cargo: Joi.string().max(100).optional(),
    departamento: Joi.string().max(100).optional(),
    status: Joi.string().valid('ativo', 'inativo').optional(),
    work_hours_start: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    work_hours_end: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    expected_daily_hours: Joi.number().min(1).max(24).optional()
});

// ============================================
// VALIDAÇÕES DE AUTENTICAÇÃO
// ============================================

const loginSchema = Joi.object({
    matricula: matriculaSchema.required(),
    password: Joi.string().required()
});

const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: passwordSchema.required()
});

const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
    newPassword: passwordSchema.required()
});

const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required()
});

// ============================================
// VALIDAÇÕES DE REGISTRO DE PONTO
// ============================================

const recordTypeSchema = Joi.string()
    .valid('entrada', 'saida_intervalo', 'retorno_intervalo', 'saida_final')
    .required()
    .messages({
        'any.only': 'Tipo de registro deve ser: entrada, saida_intervalo, retorno_intervalo ou saida_final'
    });

const createTimeRecordSchema = Joi.object({
    user_id: Joi.string().uuid().required(),
    record_type: recordTypeSchema.required()
});

const createManualRecordSchema = Joi.object({
    user_id: Joi.string().uuid().required(),
    record_type: recordTypeSchema.required(),
    timestamp: Joi.date().iso().required(),
    reason: Joi.string().min(10).max(500).required()
        .messages({
            'string.min': 'Justificativa deve ter no mínimo 10 caracteres',
            'string.max': 'Justificativa deve ter no máximo 500 caracteres'
        })
});

// Tablet register schema
const tabletRegisterSchema = Joi.object({
    matricula: matriculaSchema.required(),
    record_type: recordTypeSchema.required(),
    photo: Joi.string().optional() // Base64
});

// ============================================
// VALIDAÇÕES DE AJUSTES
// ============================================

const createAdjustmentSchema = Joi.object({
    time_record_id: Joi.string().uuid().required(),
    requested_timestamp: Joi.date().iso().required(),
    reason: Joi.string().min(10).max(500).required()
});

const reviewAdjustmentSchema = Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    reviewer_notes: Joi.string().max(500).optional()
});

// ============================================
// VALIDAÇÕES DE DATAS
// ============================================

const dateRangeSchema = Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
});

const yearMonthSchema = Joi.object({
    year: Joi.number().integer().min(2020).max(2100).required(),
    month: Joi.number().integer().min(1).max(12).required()
});

// ============================================
// FUNÇÕES HELPERS
// ============================================

/**
 * Middleware de validação genérico
 * @param {Joi.Schema} schema - Schema Joi para validar
 * @param {string} source - Fonte dos dados: 'body', 'params', 'query'
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const data = req[source];
        const { error, value } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                details: errors
            });
        }

        // Substituir dados pelo valor validado/sanitizado
        req[source] = value;
        next();
    };
};

/**
 * Valida senha e retorna erros específicos
 */
const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8) {
        errors.push('Senha deve ter no mínimo 8 caracteres');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Senha deve conter letra minúscula');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Senha deve conter letra maiúscula');
    }
    if (!/\d/.test(password)) {
        errors.push('Senha deve conter número');
    }
    if (!/[@$!%*?&]/.test(password)) {
        errors.push('Senha deve conter caractere especial (@$!%*?&)');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

module.exports = {
    // Schemas
    passwordSchema,
    cpfSchema,
    matriculaSchema,
    createUserSchema,
    updateUserSchema,
    loginSchema,
    changePasswordSchema,
    resetPasswordSchema,
    forgotPasswordSchema,
    recordTypeSchema,
    createTimeRecordSchema,
    createManualRecordSchema,
    tabletRegisterSchema,
    createAdjustmentSchema,
    reviewAdjustmentSchema,
    dateRangeSchema,
    yearMonthSchema,

    // Helpers
    validate,
    validatePassword
};
