-- Crear tabla de formularios
CREATE TABLE IF NOT EXISTS formularios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    slug TEXT,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'cerrado')),
    campos JSONB NOT NULL DEFAULT '[]'::jsonb,
    creado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear tabla de respuestas a formularios
CREATE TABLE IF NOT EXISTS formulario_respuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    formulario_id UUID REFERENCES formularios(id) ON DELETE CASCADE NOT NULL,
    club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
    respuestas JSONB NOT NULL DEFAULT '{}'::jsonb,
    archivos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_formularios_club_id ON formularios(club_id);
CREATE INDEX IF NOT EXISTS idx_formulario_respuestas_form_id ON formulario_respuestas(formulario_id);

-- RLS (Row Level Security)
ALTER TABLE formularios ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulario_respuestas ENABLE ROW LEVEL SECURITY;

-- Políticas para formularios:
-- Lectura pública para poder llenar el formulario por ID
DROP POLICY IF EXISTS "Formularios public read" ON formularios;
CREATE POLICY "Formularios public read" ON formularios
    FOR SELECT USING (true);

-- Director / Admin puede crear, actualizar y borrar formularios de su club
DROP POLICY IF EXISTS "Formularios club manage" ON formularios;
CREATE POLICY "Formularios club manage" ON formularios
    FOR ALL USING (
        club_id IN (
            SELECT club_id FROM perfiles WHERE id = auth.uid()
        ) OR (
            SELECT rol FROM perfiles WHERE id = auth.uid()
        ) = 'SuperAdmin'
    );

-- Políticas para respuestas:
-- Permitir inserción anónima / pública de respuestas
DROP POLICY IF EXISTS "Respuestas public insert" ON formulario_respuestas;
CREATE POLICY "Respuestas public insert" ON formulario_respuestas
    FOR INSERT WITH CHECK (true);

-- Solo los directores/admins del club pueden ver y gestionar respuestas
DROP POLICY IF EXISTS "Respuestas club read" ON formulario_respuestas;
CREATE POLICY "Respuestas club read" ON formulario_respuestas
    FOR SELECT USING (
        club_id IN (
            SELECT club_id FROM perfiles WHERE id = auth.uid()
        ) OR (
            SELECT rol FROM perfiles WHERE id = auth.uid()
        ) = 'SuperAdmin'
    );

-- Crear bucket de storage para archivos de formularios si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('formularios_adjuntos', 'formularios_adjuntos', true)
ON CONFLICT (id) DO NOTHING;

-- Permitir subida pública de archivos en el bucket formularios_adjuntos
DROP POLICY IF EXISTS "Public Upload Formularios" ON storage.objects;
CREATE POLICY "Public Upload Formularios" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'formularios_adjuntos');

-- Permitir descarga pública de archivos en el bucket formularios_adjuntos
DROP POLICY IF EXISTS "Public Read Formularios" ON storage.objects;
CREATE POLICY "Public Read Formularios" ON storage.objects
    FOR SELECT USING (bucket_id = 'formularios_adjuntos');
