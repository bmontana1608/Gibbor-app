-- Migración para añadir enlace entre Aportes (eventos_deportivos) y Convocatorias (eventos)

ALTER TABLE public.eventos_deportivos
ADD COLUMN IF NOT EXISTS evento_origen_id uuid REFERENCES public.eventos(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.eventos_deportivos.evento_origen_id IS 'UUID del evento (partido) creado por el entrenador. Permite vincular un cobro a una convocatoria específica.';
