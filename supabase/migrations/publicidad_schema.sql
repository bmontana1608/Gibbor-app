-- 1. Añadir pais y ciudad a la tabla clubes si no existen
ALTER TABLE public.clubes 
ADD COLUMN IF NOT EXISTS pais text,
ADD COLUMN IF NOT EXISTS ciudad text;

-- Actualizar todos los clubes existentes a Colombia - Bogota
UPDATE public.clubes 
SET pais = 'Colombia', ciudad = 'Bogota' 
WHERE pais IS NULL OR ciudad IS NULL;

-- 2. Crear tabla de Patrocinadores (Directorio Comercial)
CREATE TABLE IF NOT EXISTS public.patrocinadores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    descripcion text,
    telefono text,
    sitio_web text,
    logo_url text,
    pais text,
    ciudad text,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Crear tabla de Anuncios / Flyers
CREATE TABLE IF NOT EXISTS public.anuncios_flyers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo text NOT NULL,
    imagen_url text NOT NULL,
    link_url text,
    pais text,
    ciudad text,
    frecuencia_horas integer DEFAULT 24 NOT NULL,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.patrocinadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncios_flyers ENABLE ROW LEVEL SECURITY;

-- 5. Políticas para Patrocinadores
-- Cualquiera puede leer (SELECT)
CREATE POLICY "Lectura publica de patrocinadores" 
ON public.patrocinadores FOR SELECT 
USING (true);

-- Solo el superadmin puede modificar (INSERT, UPDATE, DELETE)
CREATE POLICY "Superadmin ALL patrocinadores" 
ON public.patrocinadores FOR ALL
USING ( 
    EXISTS (
        SELECT 1 FROM perfiles 
        WHERE perfiles.id = auth.uid() AND perfiles.rol = 'superadmin'
    )
);

-- 6. Políticas para Anuncios
-- Cualquiera puede leer (SELECT)
CREATE POLICY "Lectura publica de anuncios" 
ON public.anuncios_flyers FOR SELECT 
USING (true);

-- Solo el superadmin puede modificar (ALL)
CREATE POLICY "Superadmin ALL anuncios" 
ON public.anuncios_flyers FOR ALL
USING ( 
    EXISTS (
        SELECT 1 FROM perfiles 
        WHERE perfiles.id = auth.uid() AND perfiles.rol = 'superadmin'
    )
);
