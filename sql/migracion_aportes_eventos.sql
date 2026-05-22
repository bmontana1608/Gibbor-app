-- ============================================================
-- MIGRACIÓN: Módulo de Aportes por Evento
-- Fecha: 2026-05-22
-- Descripción: Crea tablas para gestionar aportes de partidos,
--              torneos, canchas y arbitraje, COMPLETAMENTE
--              separados del flujo de mensualidades.
-- ============================================================

-- 1. Tabla de eventos deportivos (partidos, torneos, etc.)
CREATE TABLE IF NOT EXISTS eventos_deportivos (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id        UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  tipo           TEXT NOT NULL DEFAULT 'Partido Amistoso',
  fecha          DATE NOT NULL,
  monto_sugerido NUMERIC(10,2) DEFAULT 0,
  descripcion    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas por club
CREATE INDEX IF NOT EXISTS idx_eventos_deportivos_club_id ON eventos_deportivos(club_id);
CREATE INDEX IF NOT EXISTS idx_eventos_deportivos_fecha   ON eventos_deportivos(fecha DESC);

-- 2. Tabla de aportes por evento (un registro por alumno por evento)
CREATE TABLE IF NOT EXISTS aportes_eventos (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id    UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  evento_id  UUID NOT NULL REFERENCES eventos_deportivos(id) ON DELETE CASCADE,
  perfil_id  UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  monto      NUMERIC(10,2) DEFAULT 0,
  pagado     BOOLEAN DEFAULT FALSE,
  fecha_pago DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un perfil no puede tener dos registros para el mismo evento
  UNIQUE(evento_id, perfil_id)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_aportes_eventos_evento_id ON aportes_eventos(evento_id);
CREATE INDEX IF NOT EXISTS idx_aportes_eventos_perfil_id ON aportes_eventos(perfil_id);
CREATE INDEX IF NOT EXISTS idx_aportes_eventos_club_id   ON aportes_eventos(club_id);

-- 3. RLS (Row Level Security) - Multiclub
ALTER TABLE eventos_deportivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE aportes_eventos    ENABLE ROW LEVEL SECURITY;

-- Política: Solo pueden ver/editar los usuarios autenticados del mismo club
DROP POLICY IF EXISTS "eventos_deportivos_club_policy" ON eventos_deportivos;
CREATE POLICY "eventos_deportivos_club_policy" ON eventos_deportivos
  FOR ALL USING (
    club_id = (SELECT club_id FROM perfiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "aportes_eventos_club_policy" ON aportes_eventos;
CREATE POLICY "aportes_eventos_club_policy" ON aportes_eventos
  FOR ALL USING (
    club_id = (SELECT club_id FROM perfiles WHERE id = auth.uid())
  );

-- 4. Campo fecha_ingreso_club en perfiles (fix deuda histórica)
-- Permite definir cuándo ingresó el jugador al club, independientemente
-- de cuándo se creó su cuenta en el sistema (created_at).
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS fecha_ingreso_club DATE;

COMMENT ON COLUMN perfiles.fecha_ingreso_club IS
  'Fecha en que el jugador se unió al club. Se usa para calcular deuda histórica en lugar de created_at, evitando que jugadores nuevos acumulen deuda de meses anteriores.';

COMMENT ON TABLE eventos_deportivos IS
  'Eventos deportivos (partidos, torneos, canchas) cuyos aportes NO afectan el estado de mensualidades.';

COMMENT ON TABLE aportes_eventos IS
  'Registro de aportes económicos por evento. Completamente separado del flujo de cobranza de mensualidades.';
