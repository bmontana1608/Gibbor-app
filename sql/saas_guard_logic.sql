-- ==========================================
-- SISTEMA DE SUSPENSIÓN POR MORA (SaaS Guard)
-- ==========================================

-- 1. Añadir estado de suscripción a la tabla clubes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clubes' AND column_name = 'estado_suscripcion') THEN
        ALTER TABLE clubes ADD COLUMN estado_suscripcion TEXT DEFAULT 'activo'; -- activo, suspendido
    END IF;
END $$;

-- 2. Función para suspender clubes con facturas pendientes (Día 5)
-- Esta función será llamada por pg_cron o un Edge Function
CREATE OR REPLACE FUNCTION suspender_clubes_morosos()
RETURNS void AS $$
BEGIN
    UPDATE clubes
    SET estado_suscripcion = 'suspendido'
    WHERE id IN (
        SELECT club_id 
        FROM facturacion_mensual 
        WHERE estado_pago = 'pendiente' 
        AND created_at < NOW() - INTERVAL '4 days' -- Si pasaron más de 4 días desde el día 1
    )
    AND estado_suscripcion = 'activo';
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para reactivación instantánea
-- Cuando se marca una factura como 'pagada', activar el club automáticamente
CREATE OR REPLACE FUNCTION reactivar_club_por_pago()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado_pago = 'pagado' AND OLD.estado_pago != 'pagado' THEN
        UPDATE clubes 
        SET estado_suscripcion = 'activo' 
        WHERE id = NEW.club_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_reactivacion_pago ON facturacion_mensual;
CREATE TRIGGER tr_reactivacion_pago
AFTER UPDATE ON facturacion_mensual
FOR EACH ROW
EXECUTE FUNCTION reactivar_club_por_pago();
