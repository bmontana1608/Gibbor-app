-- Ajustes Finales Módulo Embajadores

-- 1. Agregar fuente del referido a la tabla de solicitudes y clubes
ALTER TABLE public.solicitudes_club ADD COLUMN IF NOT EXISTS fuente_referido text DEFAULT 'manual' CHECK (fuente_referido IN ('qr', 'link', 'manual', 'embajador', 'otro'));
ALTER TABLE public.clubes ADD COLUMN IF NOT EXISTS fuente_referido text DEFAULT 'manual' CHECK (fuente_referido IN ('qr', 'link', 'manual', 'embajador', 'otro'));

-- 2. Crear tabla de notificaciones para los embajadores
CREATE TABLE IF NOT EXISTS public.notificaciones_embajadores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    embajador_id uuid REFERENCES public.embajadores(id) ON DELETE CASCADE,
    tipo text NOT NULL, -- 'NUEVO_CLUB', 'CLUB_ACTIVADO', 'COMISION_GENERADA', 'COMISION_PAGADA'
    mensaje text NOT NULL,
    leida boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Habilitar RLS en notificaciones_embajadores
ALTER TABLE public.notificaciones_embajadores ENABLE ROW LEVEL SECURITY;

-- Políticas para notificaciones
CREATE POLICY "Embajadores pueden ver sus propias notificaciones"
ON public.notificaciones_embajadores
FOR SELECT
USING (embajador_id IN (
    SELECT id FROM public.embajadores WHERE user_id = auth.uid()
));

CREATE POLICY "Embajadores pueden actualizar sus propias notificaciones"
ON public.notificaciones_embajadores
FOR UPDATE
USING (embajador_id IN (
    SELECT id FROM public.embajadores WHERE user_id = auth.uid()
));

-- 3. Registrar última actividad del embajador
ALTER TABLE public.embajadores ADD COLUMN IF NOT EXISTS ultima_actividad timestamptz DEFAULT now();
