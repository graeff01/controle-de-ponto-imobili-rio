-- View: Jornada diária completa
CREATE OR REPLACE VIEW daily_journey AS
SELECT 
  user_id,
  DATE(timestamp) as date,
  MAX(CASE WHEN record_type = 'entrada' THEN timestamp END) as entrada,
  MAX(CASE WHEN record_type = 'saida_intervalo' THEN timestamp END) as saida_intervalo,
  MAX(CASE WHEN record_type = 'retorno_intervalo' THEN timestamp END) as retorno_intervalo,
  MAX(CASE WHEN record_type = 'saida_final' THEN timestamp END) as saida_final,
  COUNT(*) as total_registros
FROM time_records
GROUP BY user_id, DATE(timestamp);

-- View: Horas trabalhadas por dia (Fuso Brasília AT TIME ZONE)
CREATE OR REPLACE VIEW hours_worked_daily AS
SELECT 
  user_id,
  date,
  CASE 
    -- Se tem entrada e saída final, calcula. Se tem intervalo, desconta.
    WHEN entrada IS NOT NULL AND saida_final IS NOT NULL THEN
      (EXTRACT(EPOCH FROM (saida_final - entrada))/3600) - 
      COALESCE(
        CASE 
          WHEN retorno_intervalo IS NOT NULL AND saida_intervalo IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (retorno_intervalo - saida_intervalo))/3600 
          ELSE 0 
        END, 0
      )
    ELSE NULL
  END as hours_worked,
  CASE 
    WHEN entrada IS NOT NULL AND saida_final IS NULL THEN 'incompleto'
    WHEN entrada IS NULL THEN 'ausente'
    ELSE 'completo'
  END as status
FROM daily_journey;

-- Comentários
COMMENT ON VIEW daily_journey IS 'Visão consolidada da jornada diária de cada funcionário';
COMMENT ON VIEW hours_worked_daily IS 'Cálculo de horas trabalhadas e status da jornada';
