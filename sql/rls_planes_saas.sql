-- Habilitar explícitamente el Row Level Security en la tabla
ALTER TABLE planes_saas ENABLE ROW LEVEL SECURITY;

-- 1. Política de LECTURA: Todos los usuarios autenticados pueden ver los planes
DROP POLICY IF EXISTS "Lectura publica de planes" ON planes_saas;
CREATE POLICY "Lectura publica de planes" ON planes_saas
FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Política de INSERCIÓN: Solo SuperAdmin puede crear nuevos planes
DROP POLICY IF EXISTS "Insercion SuperAdmin planes" ON planes_saas;
CREATE POLICY "Insercion SuperAdmin planes" ON planes_saas
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'SuperAdmin')
);

-- 3. Política de ACTUALIZACIÓN: Solo SuperAdmin puede editar planes
DROP POLICY IF EXISTS "Actualizacion SuperAdmin planes" ON planes_saas;
CREATE POLICY "Actualizacion SuperAdmin planes" ON planes_saas
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'SuperAdmin')
);

-- 4. Política de ELIMINACIÓN: Solo SuperAdmin puede borrar planes
DROP POLICY IF EXISTS "Eliminacion SuperAdmin planes" ON planes_saas;
CREATE POLICY "Eliminacion SuperAdmin planes" ON planes_saas
FOR DELETE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'SuperAdmin')
);

-- NOTA EXTRA PARA LA TABLA DE CLUBES:
-- Asegurarse de que el SuperAdmin pueda actualizar la tabla de clubes para asignar planes
DROP POLICY IF EXISTS "Actualizacion SuperAdmin clubes" ON clubes;
CREATE POLICY "Actualizacion SuperAdmin clubes" ON clubes
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'SuperAdmin')
);
