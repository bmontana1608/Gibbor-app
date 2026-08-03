-- SQL Script para crear la tabla biblioteca_ejercicios

CREATE TABLE IF NOT EXISTS public.biblioteca_ejercicios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scope TEXT NOT NULL CHECK (scope IN ('Global', 'Club', 'Personal')),
    club_id UUID REFERENCES public.clubes(id) ON DELETE CASCADE,
    autor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    video_url TEXT NOT NULL,
    fase_juego TEXT,
    categoria_edad TEXT,
    tipo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Políticas RLS (Row Level Security)
ALTER TABLE public.biblioteca_ejercicios ENABLE ROW LEVEL SECURITY;

-- 1. Lectura: Ver ejercicios Globales OR ejercicios del propio club
CREATE POLICY "Lectura biblioteca_ejercicios" 
ON public.biblioteca_ejercicios FOR SELECT 
USING (
  scope = 'Global' OR 
  club_id = (SELECT club_id FROM public.perfiles WHERE id = auth.uid())
);

-- 2. Inserción: Entrenadores pueden crear scope 'Personal', Directores scope 'Club'
CREATE POLICY "Inserción biblioteca_ejercicios" 
ON public.biblioteca_ejercicios FOR INSERT 
WITH CHECK (
  autor_id = auth.uid() AND
  club_id = (SELECT club_id FROM public.perfiles WHERE id = auth.uid())
);

-- 3. Edición: Solo el autor puede editar su ejercicio (o el SuperAdmin)
CREATE POLICY "Actualización biblioteca_ejercicios" 
ON public.biblioteca_ejercicios FOR UPDATE 
USING (
  autor_id = auth.uid() OR
  (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'SuperAdmin'
);

-- 4. Borrado: Solo el autor o SuperAdmin
CREATE POLICY "Borrado biblioteca_ejercicios" 
ON public.biblioteca_ejercicios FOR DELETE 
USING (
  autor_id = auth.uid() OR
  (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'SuperAdmin'
);
