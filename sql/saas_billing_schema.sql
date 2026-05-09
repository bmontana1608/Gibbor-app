-- ==========================================
-- ESTRUCTURA FINANCIERA SAAS MULTICLUB
-- ==========================================

-- 1. TABLA DE PLANES SAAS
CREATE TABLE IF NOT EXISTS planes_saas (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio_por_jugador NUMERIC NOT NULL DEFAULT 2000,
    moneda TEXT DEFAULT 'COP',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar un plan por defecto
INSERT INTO planes_saas (nombre, precio_por_jugador, moneda) 
VALUES ('Plan Estándar (Por Consumo)', 2000, 'COP')
ON CONFLICT DO NOTHING;

-- 2. MODIFICACIÓN DE TABLA CLUBES
-- Añadir plan_id a la tabla clubes si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clubes' AND column_name = 'plan_id') THEN
        ALTER TABLE clubes ADD COLUMN plan_id INTEGER REFERENCES planes_saas(id);
    END IF;
END $$;

-- Asignar el plan por defecto a los clubes existentes
UPDATE clubes SET plan_id = 1 WHERE plan_id IS NULL;

-- 3. TABLA DE FACTURACIÓN MENSUAL
CREATE TABLE IF NOT EXISTS facturacion_mensual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
    periodo_mes INTEGER NOT NULL,
    periodo_anio INTEGER NOT NULL,
    cantidad_jugadores INTEGER NOT NULL DEFAULT 0,
    tarifa_aplicada NUMERIC NOT NULL DEFAULT 0,
    total_pagar NUMERIC NOT NULL DEFAULT 0,
    estado_pago TEXT NOT NULL DEFAULT 'pendiente', -- pendiente, pagado, atrasado
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unq_factura_periodo UNIQUE (club_id, periodo_mes, periodo_anio) -- Evita duplicidad
);

-- Habilitar RLS en la tabla de facturación
ALTER TABLE facturacion_mensual ENABLE ROW LEVEL SECURITY;

-- Política: SuperAdmin ve todo, Club solo ve lo suyo
DROP POLICY IF EXISTS "Aislamiento Multiclub en Facturacion" ON facturacion_mensual;
CREATE POLICY "Aislamiento Multiclub en Facturacion" ON facturacion_mensual
FOR ALL USING (
    (SELECT EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'SuperAdmin'))
    OR club_id = (SELECT club_id FROM perfiles WHERE id = auth.uid())
);
