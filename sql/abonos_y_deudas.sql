-- ============================================================
-- SISTEMA DE ABONOS Y DEUDA ACUMULADA - EFD GIBBOR / MCM
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla de abonos: registra cada pago parcial o completo por período
CREATE TABLE IF NOT EXISTS abonos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL,
  perfil_id       UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  periodo         DATE NOT NULL,           -- Primer día del mes cobrado (ej: 2026-04-01)
  monto           NUMERIC(10,2) NOT NULL,  -- Monto del abono
  metodo          VARCHAR(100) DEFAULT 'Efectivo',
  notas           TEXT,
  registrado_por  UUID,                    -- id del director que lo registró
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_abonos_perfil    ON abonos(perfil_id);
CREATE INDEX IF NOT EXISTS idx_abonos_club      ON abonos(club_id);
CREATE INDEX IF NOT EXISTS idx_abonos_periodo   ON abonos(periodo);

-- 3. Row Level Security
ALTER TABLE abonos ENABLE ROW LEVEL SECURITY;

-- Política: solo el director de ese club puede ver y gestionar abonos
CREATE POLICY "Club members access abonos"
  ON abonos FOR ALL
  USING (
    club_id IN (
      SELECT id FROM clubs
      WHERE id = (
        SELECT club_id FROM perfiles
        WHERE id = auth.uid()
        LIMIT 1
      )
    )
  );

-- ============================================================
-- VISTA: saldo_por_jugador
-- Calcula la deuda total acumulada de cada jugador:
--   deuda_total    = suma de todas las mensualidades generadas (cargos)
--   total_abonado  = suma de todos los abonos registrados
--   saldo_pendiente = deuda_total - total_abonado
--
-- NOTA: La "deuda generada" se toma de pagos_ingresos (monto_base)
--       más los meses sin pago registrado (calculado en la app).
--       La vista calcula solo los abonos parciales.
-- ============================================================
CREATE OR REPLACE VIEW saldo_jugadores AS
SELECT
  p.id                                              AS perfil_id,
  p.club_id,
  p.nombres,
  p.apellidos,
  p.tipo_plan,
  COALESCE(SUM(a.monto), 0)                         AS total_abonado,
  -- Suma de meses cobrados (pagos completos registrados)
  COALESCE((
    SELECT SUM(pi.total)
    FROM pagos_ingresos pi
    WHERE pi.jugador_id = p.id
  ), 0)                                             AS total_pagado_completo
FROM perfiles p
LEFT JOIN abonos a ON a.perfil_id = p.id
WHERE p.rol NOT IN ('Director', 'Entrenador')
  AND p.estado_miembro != 'Pendiente'
GROUP BY p.id, p.club_id, p.nombres, p.apellidos, p.tipo_plan;
