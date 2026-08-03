-- 3.b Añadir campos personales a la tabla embajadores para postulaciones pendientes
ALTER TABLE embajadores
ADD COLUMN IF NOT EXISTS nombre_completo TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS telefono TEXT,
ADD COLUMN IF NOT EXISTS ciudad TEXT;
