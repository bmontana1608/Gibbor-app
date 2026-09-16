-- 1. Crear la tabla atlas_academias
CREATE TABLE IF NOT EXISTS public.atlas_academias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT,
    website TEXT,
    direccion TEXT,
    ciudad TEXT,
    categoria TEXT,
    rating NUMERIC(3, 1),
    reviews INTEGER DEFAULT 0,
    latitud NUMERIC,
    longitud NUMERIC,
    estado TEXT DEFAULT 'Prospecto',
    prioridad TEXT DEFAULT 'Baja',
    score INTEGER DEFAULT 0,
    embajador_id UUID REFERENCES public.embajadores(id) ON DELETE SET NULL,
    fecha_importacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ultimo_contacto TIMESTAMP WITH TIME ZONE,
    proximo_contacto TIMESTAMP WITH TIME ZONE,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.atlas_academias ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas de Seguridad
-- Solo usuarios autenticados (Idealmente validando que sea SuperAdmin, pero por simplicidad permitimos a autenticados, y la API filtra)
CREATE POLICY "Permitir lectura a autenticados" 
    ON public.atlas_academias FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir todo al service_role" 
    ON public.atlas_academias FOR ALL 
    TO service_role 
    USING (true) WITH CHECK (true);

-- 4. Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_atlas_academias_modtime ON public.atlas_academias;
CREATE TRIGGER update_atlas_academias_modtime
    BEFORE UPDATE ON public.atlas_academias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
