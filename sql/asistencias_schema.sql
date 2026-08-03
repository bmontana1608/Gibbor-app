-- ============================================================
-- TABLA: asistencias — Schema completo con todas las columnas
-- Ejecutar en Supabase SQL Editor si la tabla no existe o tiene columnas faltantes
-- ============================================================

-- Opción 1: Crear la tabla desde cero (si no existe)
CREATE TABLE IF NOT EXISTS asistencias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id      UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  club_id         UUID NOT NULL,
  grupo           TEXT,
  estado          TEXT NOT NULL DEFAULT 'Presente', -- 'Presente', 'Ausente', 'Excusa'
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  registrado_por  TEXT,
  evento_id       UUID,  -- Referencia opcional al evento/sesión
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Opción 2: Si la tabla ya existe pero le falta evento_id, agregar solo la columna:
ALTER TABLE asistencias ADD COLUMN IF NOT EXISTS evento_id UUID;

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_asistencias_jugador ON asistencias(jugador_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_club    ON asistencias(club_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha   ON asistencias(fecha);

-- RLS: habilitar si no está habilitado
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;

-- Política de acceso (ejecutar solo si no existe)
DROP POLICY IF EXISTS "Aislamiento Multiclub en Asistencias" ON asistencias;
CREATE POLICY "Aislamiento Multiclub en Asistencias" ON asistencias
  FOR ALL USING (
    club_id IN (
      SELECT id FROM clubs WHERE id = (
        SELECT club_id FROM perfiles WHERE id = auth.uid() LIMIT 1
      )
    )
  );
