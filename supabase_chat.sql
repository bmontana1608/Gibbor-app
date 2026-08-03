-- Tabla para guardar los mensajes del chat de cada ticket
CREATE TABLE IF NOT EXISTS tickets_mensajes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets_soporte(id) ON DELETE CASCADE,
    remitente_id UUID REFERENCES perfiles(id) ON DELETE SET NULL, -- Puede ser nulo si el que responde es el SuperAdmin genérico (service_role), aunque podemos forzarlo.
    es_staff BOOLEAN DEFAULT false, -- true si el mensaje lo envió el SuperAdmin, false si lo envió el Director
    mensaje TEXT NOT NULL,
    leido BOOLEAN DEFAULT false,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE tickets_mensajes ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
-- El Superadmin puede ver y enviar todo
CREATE POLICY "Superadmin ve todos los mensajes" ON tickets_mensajes FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IN (SELECT id FROM perfiles WHERE rol = 'SuperAdmin'));

-- Los directores pueden ver los mensajes de los tickets que les pertenecen
CREATE POLICY "Directores ven mensajes de sus tickets" ON tickets_mensajes FOR SELECT USING (
    ticket_id IN (SELECT id FROM tickets_soporte WHERE director_id = auth.uid())
);

-- Los directores pueden enviar mensajes a sus propios tickets
CREATE POLICY "Directores envian mensajes a sus tickets" ON tickets_mensajes FOR INSERT WITH CHECK (
    ticket_id IN (SELECT id FROM tickets_soporte WHERE director_id = auth.uid()) AND
    remitente_id = auth.uid() AND
    es_staff = false
);
