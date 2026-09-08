-- Agregar columna para pool de hasta 10 claves API de Gemini con rotación inteligente
ALTER TABLE configuracion_superadmin 
ADD COLUMN IF NOT EXISTS gemini_api_keys JSONB DEFAULT '[]'::jsonb;
