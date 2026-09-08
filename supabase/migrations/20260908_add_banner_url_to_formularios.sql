-- Agregar columna para almacenar el banner personalizado del formulario
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS banner_url TEXT;
