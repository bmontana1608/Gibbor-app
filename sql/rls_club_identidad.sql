-- ==========================================
-- POLÍTICAS RLS PARA IDENTIDAD VISUAL (CLUBES)
-- ==========================================

-- Habilitar RLS en la tabla clubes si no está habilitado
ALTER TABLE clubes ENABLE ROW LEVEL SECURITY;

-- 1. Política de Lectura (Pública o Autenticada)
-- Permite que cualquier usuario lea la configuración visual de los clubes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'clubes' AND policyname = 'Permitir lectura publica de clubes'
    ) THEN
        CREATE POLICY "Permitir lectura publica de clubes" ON clubes FOR SELECT USING (true);
    END IF;
END
$$;

-- 2. Política de Actualización (Solo Director del Club)
-- Asegura que solo un perfil con rol 'Director' pueda actualizar los datos de su propio club
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'clubes' AND policyname = 'Directores pueden actualizar su propio club'
    ) THEN
        CREATE POLICY "Directores pueden actualizar su propio club" 
        ON clubes
        FOR UPDATE 
        USING (
            EXISTS (
                SELECT 1 FROM perfiles
                WHERE perfiles.id = auth.uid()
                  AND perfiles.club_id = clubes.id
                  AND perfiles.rol = 'Director'
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM perfiles
                WHERE perfiles.id = auth.uid()
                  AND perfiles.club_id = clubes.id
                  AND perfiles.rol = 'Director'
            )
        );
    END IF;
END
$$;

-- Nota: Si la política ya existe y necesitas recrearla, ejecuta esto primero:
-- DROP POLICY IF EXISTS "Directores pueden actualizar su propio club" ON clubes;
