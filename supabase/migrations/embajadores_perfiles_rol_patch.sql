-- Modificar la restricción (Check Constraint) de la columna "rol" en la tabla "perfiles"
-- para permitir el nuevo rol de 'Embajador'

ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;

ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_rol_check 
CHECK (rol IN ('SuperAdmin', 'Director', 'Entrenador', 'Futbolista', 'Embajador'));
