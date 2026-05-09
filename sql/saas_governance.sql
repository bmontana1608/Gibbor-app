-- ==========================================
-- SAAS GOVERNANCE & AUDIT LOGS
-- ==========================================

-- 1. AMPLIACIÓN DE DATOS SENSIBLES DE CLUBES
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS correo_administrativo TEXT;
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS telefono_contacto TEXT;
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS nombre_legal TEXT;
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. TABLA DE AUDITORÍA DE ADMINISTRACIÓN
CREATE TABLE IF NOT EXISTS logs_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES perfiles(id),
    accion TEXT NOT NULL, -- 'EDIT_CLUB', 'RESET_PASSWORD', 'CHANGE_EMAIL', 'CREATE_ADMIN'
    entidad_tipo TEXT NOT NULL, -- 'clubes', 'auth_users'
    entidad_id TEXT NOT NULL,
    detalles JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE logs_admin ENABLE ROW LEVEL SECURITY;

-- Solo SuperAdmin puede ver los logs
CREATE POLICY "Solo SuperAdmin ve logs de auditoria" ON logs_admin
FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'SuperAdmin')
);

-- 3. TABLA DE NOTIFICACIONES PARA ADMINS (Opcional pero útil)
CREATE TABLE IF NOT EXISTS alertas_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    nivel TEXT DEFAULT 'info', -- info, warning, critical
    leido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE alertas_admin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo SuperAdmin gestiona alertas" ON alertas_admin
FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'SuperAdmin')
);
