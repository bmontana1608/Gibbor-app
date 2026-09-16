-- ==========================================
-- FIX: PERMITIR REGISTRO PÚBLICO EN PERFILES
-- ==========================================

-- 1. Permitir que usuarios no autenticados (públicos) puedan insertar sus datos
-- Esta política es necesaria para que el formulario de inscripción funcione.
DROP POLICY IF EXISTS "Permitir Registro Público" ON perfiles;
CREATE POLICY "Permitir Registro Público" ON perfiles
FOR INSERT 
WITH CHECK (true);

-- 2. Asegurarse de que el bucket de 'documentos' también sea público para subidas
-- (Si ya existe, esto no hará daño)
-- Nota: En Supabase Dashboard es más fácil configurar los buckets, 
-- pero aquí nos aseguramos de que la tabla de perfiles acepte el registro.
