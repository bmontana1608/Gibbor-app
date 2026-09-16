-- Migración para canales de pago del SuperAdmin en Master Club Manager
ALTER TABLE configuracion_superadmin 
ADD COLUMN IF NOT EXISTS canales_pago JSONB DEFAULT '{
  "banco_nombre": "Bancolombia Ahorros",
  "banco_numero": "3124265170",
  "nequi": "3124265170",
  "daviplata": "3124265170",
  "bre_b": "3124265170",
  "titular": "Master Club Manager"
}'::jsonb;
