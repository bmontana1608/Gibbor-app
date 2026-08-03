-- Migración: Agregar columnas de Medios de Pago SaaS a configuracion_superadmin
-- Ejecutar este SQL en el SQL Editor de Supabase

ALTER TABLE configuracion_superadmin
  ADD COLUMN IF NOT EXISTS saas_nequi TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS saas_daviplata TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS saas_bre_b TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS saas_bancolombia TEXT DEFAULT '';

-- También agregar gemini_api_key y slack_webhook_url si no existen
ALTER TABLE configuracion_superadmin
  ADD COLUMN IF NOT EXISTS gemini_api_key TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT DEFAULT NULL;

-- Confirmar columnas actuales de la tabla
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'configuracion_superadmin'
ORDER BY ordinal_position;
