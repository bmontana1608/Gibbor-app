-- ==========================================
-- TABLA DE LOGS DE NOTIFICACIONES
-- ==========================================

CREATE TABLE IF NOT EXISTS logs_notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
    destinatario TEXT NOT NULL, -- Número de teléfono
    mensaje TEXT NOT NULL,
    tipo_evento TEXT NOT NULL, -- 'bienvenida', 'facturacion', etc.
    estado TEXT NOT NULL, -- 'exito', 'fallido'
    error_detalle TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para logs
ALTER TABLE logs_notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin ve todos los logs" ON logs_notificaciones
FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'SuperAdmin')
);

CREATE POLICY "Club ve sus propios logs" ON logs_notificaciones
FOR SELECT USING (
    club_id = (SELECT club_id FROM perfiles WHERE id = auth.uid())
);
