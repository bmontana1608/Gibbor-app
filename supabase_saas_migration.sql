-- 1. Modificar tabla de clubes
ALTER TABLE clubes 
ADD COLUMN IF NOT EXISTS fecha_fin_prueba TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tarifa_por_jugador NUMERIC DEFAULT 2000;

-- 2. Crear tabla de configuracion_superadmin
CREATE TABLE IF NOT EXISTS configuracion_superadmin (
    id SERIAL PRIMARY KEY,
    telefono_soporte VARCHAR(20) DEFAULT '+573124265170',
    mensaje_cobro TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración inicial
INSERT INTO configuracion_superadmin (id, telefono_soporte) 
VALUES (1, '+573124265170')
ON CONFLICT (id) DO NOTHING;

-- 3. Crear tabla de facturas SaaS (el corte de cada mes)
CREATE TABLE IF NOT EXISTS facturas_saas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL,
    anio INTEGER NOT NULL,
    monto_total NUMERIC NOT NULL,
    cantidad_jugadores INTEGER NOT NULL,
    estado VARCHAR(20) DEFAULT 'Pendiente', -- Pendiente, Pagada, Vencida
    fecha_vencimiento TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear tabla de pagos SaaS (cuando el club paga la factura)
CREATE TABLE IF NOT EXISTS pagos_saas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubes(id) ON DELETE CASCADE,
    factura_id UUID REFERENCES facturas_saas(id) ON DELETE SET NULL,
    monto_pagado NUMERIC NOT NULL,
    metodo_pago VARCHAR(50),
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    comprobante_url TEXT,
    estado VARCHAR(20) DEFAULT 'Aprobado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
