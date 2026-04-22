-- ==========================================
-- GIBBOR CLOUD: BLINDAJE SAAS MULTICLUB (RLS)
-- ==========================================

-- 1. CREACIÓN DE FUNCIONES DE SEGURIDAD MÁXIMA (SECURITY DEFINER)
-- Estas funciones evitan bucles infinitos y verifican rápido la identidad.

CREATE OR REPLACE FUNCTION auth_is_superadmin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'SuperAdmin'
  );
$$;

CREATE OR REPLACE FUNCTION auth_my_club_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT club_id FROM perfiles WHERE id = auth.uid();
$$;

-- 2. HABILITAR RLS EN TODAS LAS TABLAS QUE DEBEN ESTAR AISLADAS
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_wa ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_wa ENABLE ROW LEVEL SECURITY;

-- 3. APLICAR POLÍTICAS GLOBALES "ISOLATION" A CADA TABLA

-- ==================
-- TABLA: perfiles
-- ==================
DROP POLICY IF EXISTS "Aislamiento Multiclub en Perfiles" ON perfiles;
CREATE POLICY "Aislamiento Multiclub en Perfiles" ON perfiles
FOR ALL USING (
  -- SuperAdmin ve todo
  auth_is_superadmin() 
  -- Un perfil se puede ver a sí mismo
  OR id = auth.uid()
  -- O puede ver/modificar perfiles que pertenezcan a su mismo club
  OR club_id = auth_my_club_id()
);

-- ==================
-- TABLA: planes
-- ==================
DROP POLICY IF EXISTS "Aislamiento Multiclub en Planes" ON planes;
CREATE POLICY "Aislamiento Multiclub en Planes" ON planes
FOR ALL USING (
  auth_is_superadmin() OR club_id = auth_my_club_id()
);

-- ==================
-- TABLA: pagos_ingresos
-- ==================
DROP POLICY IF EXISTS "Aislamiento Multiclub en Pagos" ON pagos_ingresos;
CREATE POLICY "Aislamiento Multiclub en Pagos" ON pagos_ingresos
FOR ALL USING (
  auth_is_superadmin() OR club_id = auth_my_club_id()
);

-- ==================
-- TABLA: asistencias
-- ==================
DROP POLICY IF EXISTS "Aislamiento Multiclub en Asistencias" ON asistencias;
CREATE POLICY "Aislamiento Multiclub en Asistencias" ON asistencias
FOR ALL USING (
  auth_is_superadmin() OR club_id = auth_my_club_id()
);

-- ==================
-- TABLA: configuracion_wa y mensajes_wa
-- ==================
DROP POLICY IF EXISTS "Aislamiento Multiclub en Config WA" ON configuracion_wa;
CREATE POLICY "Aislamiento Multiclub en Config WA" ON configuracion_wa
FOR ALL USING (
  auth_is_superadmin() OR club_id = auth_my_club_id()
);

DROP POLICY IF EXISTS "Aislamiento Multiclub en Mensajes" ON mensajes_wa;
CREATE POLICY "Aislamiento Multiclub en Mensajes" ON mensajes_wa
FOR ALL USING (
  auth_is_superadmin() OR club_id = auth_my_club_id()
);

-- RECOMENDACIÓN FINAL PARA CLUBES NUEVOS:
-- Asegurarse de que el Owner/SuperAdmin o Service Role pueda registrar el club.
ALTER TABLE clubes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden leer clubes, solo SuperAdmin edita" ON clubes;
CREATE POLICY "Todos pueden leer clubes, solo SuperAdmin edita" ON clubes
FOR SELECT USING (true); -- Permitimos leer a todos para el login screen

-- Nota: Las operaciones de escritura en `clubes` ya se hacen desde la API en Next.js con el "Service Role Key" (Privilegio Root), por lo cual esta política de lectura es suficiente.
