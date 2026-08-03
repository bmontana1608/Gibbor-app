-- Ejecuta este script en el SQL Editor de Supabase
-- Tabla para solicitudes de clubes que quieren usar la plataforma

CREATE TABLE IF NOT EXISTS solicitudes_club (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_academia TEXT NOT NULL,
  nombre_director TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  ciudad TEXT,
  pais TEXT DEFAULT 'Colombia',
  jugadores_estimados INTEGER,
  mensaje TEXT,
  estado TEXT DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'En Revisión', 'Aprobado', 'Rechazado')),
  notas_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_solicitudes_club_estado ON solicitudes_club(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_club_created ON solicitudes_club(created_at DESC);
