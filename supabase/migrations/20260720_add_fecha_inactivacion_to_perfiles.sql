-- Migration: Add fecha_inactivacion to perfiles table
-- Date: 2026-07-20

ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS fecha_inactivacion DATE;

COMMENT ON COLUMN public.perfiles.fecha_inactivacion IS 'Fecha en la que el miembro fue marcado como Inactivo. Se utiliza para generar la curva dinámica de crecimiento del club.';
