-- ==========================================
-- AUTOMATIZACIÓN DE FACTURACIÓN (pg_cron)
-- ==========================================

-- 1. Habilitar las extensiones necesarias si no están habilitadas
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Programar la tarea mensual (Día 1 de cada mes a las 00:00)
-- IMPORTANTE: Reemplaza 'URL_DE_TU_PROYECTO' por la URL real de tu proyecto en Supabase
-- IMPORTANTE: Reemplaza 'TU_ANON_KEY' por tu clave pública (anon key)
SELECT cron.schedule(
  'facturacion-mensual-job', -- Nombre único para la tarea
  '0 0 1 * *',               -- Expresión Cron (Minuto 0, Hora 0, Día 1, Cada Mes, Cualquier día de la semana)
  $$
    SELECT net.http_post(
        url:='https://<URL_DE_TU_PROYECTO>.supabase.co/functions/v1/facturacion-mensual',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <TU_ANON_KEY>"}'::jsonb
    )
  $$
);

-- Utilidad: Si alguna vez necesitas detener la automatización, ejecuta:
-- SELECT cron.unschedule('facturacion-mensual-job');

-- Utilidad: Para ver los trabajos programados actualmente:
-- SELECT * FROM cron.job;
