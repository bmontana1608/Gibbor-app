-- Migración para implementar Soft Deletes en la tabla de clubes
-- Ejecutar en el SQL Editor de Supabase

-- 1. Añadir columna deleted_at
ALTER TABLE clubes 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Crear un índice para mejorar el rendimiento de las consultas filtradas
CREATE INDEX IF NOT EXISTS idx_clubes_deleted_at ON clubes(deleted_at);

-- 3. Actualizar la vista o políticas si es necesario para ignorar clubes eliminados
-- Por defecto, las consultas de Supabase traerán todo a menos que se filtre explícitamente por is null
-- Ejemplo de política RLS:
-- ALTER POLICY "Enable read access for all users" ON "public"."clubes"
-- USING (deleted_at IS NULL);

COMMENT ON COLUMN clubes.deleted_at IS 'Fecha de eliminación lógica (Soft Delete). Si es NULL, el club está activo.';
