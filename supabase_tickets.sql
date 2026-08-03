-- 1. Añadir columna para Slack Webhook en configuracion_superadmin
ALTER TABLE configuracion_superadmin 
ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;

-- 2. Crear tabla de tickets_soporte
CREATE TABLE IF NOT EXISTS tickets_soporte (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
    director_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    asunto TEXT NOT NULL,
    categoria TEXT NOT NULL, -- ej: Error, Duda, Sugerencia, Facturación
    mensaje TEXT NOT NULL,
    estado TEXT DEFAULT 'Abierto', -- Abierto, En Progreso, Resuelto
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (opcional si ya usas service_role para el superadmin, pero lo dejamos público o autenticado si los directores insertan directo)
ALTER TABLE tickets_soporte ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Directores pueden insertar tickets de su club"
ON tickets_soporte FOR INSERT
WITH CHECK (auth.uid() = director_id);

CREATE POLICY "Directores pueden ver tickets de su club"
ON tickets_soporte FOR SELECT
USING (auth.uid() = director_id);

CREATE POLICY "Superadmin tiene acceso total a tickets"
ON tickets_soporte FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IN (SELECT id FROM perfiles WHERE rol = 'SuperAdmin'));

-- TRIGGER para actualizar el campo actualizado_en
CREATE OR REPLACE FUNCTION set_actualizado_en_tickets()
RETURNS TRIGGER AS $$
BEGIN
   NEW.actualizado_en = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizado_en_tickets
BEFORE UPDATE ON tickets_soporte
FOR EACH ROW
EXECUTE FUNCTION set_actualizado_en_tickets();
