-- Añadir columna logo_url a solicitudes_club si no existe
ALTER TABLE solicitudes_club ADD COLUMN IF NOT EXISTS logo_url TEXT;
