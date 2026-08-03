-- 1. Agregar embajador_padre_id a la tabla embajadores (Para jerarquías futuras)
ALTER TABLE public.embajadores 
ADD COLUMN IF NOT EXISTS embajador_padre_id UUID REFERENCES public.embajadores(id) ON DELETE SET NULL;

-- 2. Agregar columnas de trazabilidad a la tabla comisiones
ALTER TABLE public.comisiones
ADD COLUMN IF NOT EXISTS porcentaje_aplicado DECIMAL(5,2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS comprobante_pago TEXT NULL,
ADD COLUMN IF NOT EXISTS observaciones TEXT NULL;

-- 3. Crear una vista para que sea más fácil calcular los clientes ACTIVOS
CREATE OR REPLACE VIEW public.vw_embajadores_metricas AS
SELECT 
  e.id as embajador_id,
  e.nombre_completo,
  e.codigo_referido,
  (SELECT count(*) FROM public.clubes c WHERE c.embajador_id = e.id AND c.estado_referido = 'Cliente Activo') as clientes_activos,
  (SELECT count(*) FROM public.clubes c WHERE c.embajador_id = e.id) as total_referidos,
  (SELECT COALESCE(SUM(monto), 0) FROM public.comisiones com WHERE com.embajador_id = e.id AND com.estado = 'Pagada') as comisiones_pagadas,
  (SELECT COALESCE(SUM(monto), 0) FROM public.comisiones com WHERE com.embajador_id = e.id AND com.estado = 'Pendiente') as comisiones_pendientes
FROM public.embajadores e;
