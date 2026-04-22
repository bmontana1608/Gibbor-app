-- Ejecuta esto en el SQL Editor de tu panel de Supabase para permitir el rol SuperAdmin

ALTER TABLE perfiles 
DROP CONSTRAINT IF EXISTS perfiles_rol_check;

ALTER TABLE perfiles 
ADD CONSTRAINT perfiles_rol_check 
CHECK (rol IN ('Director', 'Administrador', 'Entrenador', 'Futbolista', 'SuperAdmin'));
