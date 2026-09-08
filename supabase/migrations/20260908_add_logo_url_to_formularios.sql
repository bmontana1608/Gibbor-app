-- Agregar columna logo_url a la tabla formularios
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS logo_url TEXT;
