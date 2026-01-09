const Joi = require('joi');

const validators = {
  // Validação de login
  loginSchema: Joi.object({
    matricula: Joi.string().required(),
    password: Joi.string().required()
  }),

  // Validação de registro de ponto
  timeRecordSchema: Joi.object({
    user_id: Joi.string().uuid().required(),
    record_type: Joi.string().valid('entrada', 'saida_intervalo', 'retorno_intervalo', 'saida_final').required()
  }),

  // Validação de criação de usuário
  createUserSchema: Joi.object({
    matricula: Joi.string().min(3).max(20).required(),
    cpf: Joi.string().length(11).required(),
    nome: Joi.string().min(3).max(255).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    cargo: Joi.string().max(100).optional(),
    departamento: Joi.string().max(100).optional(),
    data_admissao: Joi.date().optional()
  }),

  // Validação de ajuste de ponto
  adjustmentSchema: Joi.object({
    time_record_id: Joi.string().uuid().required(),
    adjusted_timestamp: Joi.date().iso().required(),
    adjusted_type: Joi.string().valid('entrada', 'saida_intervalo', 'retorno_intervalo', 'saida_final').required(),
    reason: Joi.string().min(10).max(500).required()
  })
};

module.exports = validators;
