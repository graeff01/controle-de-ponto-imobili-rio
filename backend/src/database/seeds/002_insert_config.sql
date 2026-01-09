-- Inserir configurações padrão do sistema
INSERT INTO system_config (key, value, description) VALUES
  ('jornada_diaria_horas', '8', 'Horas de jornada diária padrão'),
  ('jornada_semanal_horas', '44', 'Horas de jornada semanal máxima'),
  ('intervalo_minimo_minutos', '60', 'Intervalo mínimo obrigatório (minutos)'),
  ('tolerancia_atraso_minutos', '10', 'Tolerância de atraso sem alerta'),
  ('email_alertas_gestor', '[]', 'Emails para receber alertas (JSON array)')
ON CONFLICT (key) DO NOTHING;
