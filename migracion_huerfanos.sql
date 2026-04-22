-- ==============================================
-- SAAS MIGRATION: RESCATE DE DATOS HUÉRFANOS
-- Asigna toda la data antigua de la app a Gibbor
-- ==============================================

DO $$
DECLARE
  v_gibbor_id UUID;
BEGIN
  -- 1. Buscamos el ID oficial del club original (Gibbor)
  SELECT id INTO v_gibbor_id FROM clubes WHERE slug = 'gibbor' LIMIT 1;
  
  -- 2. Si lo encontramos, le entregamos la paternidad absoluta de la data huérfana
  IF v_gibbor_id IS NOT NULL THEN
     UPDATE perfiles SET club_id = v_gibbor_id WHERE club_id IS NULL;
     UPDATE planes SET club_id = v_gibbor_id WHERE club_id IS NULL;
     UPDATE pagos_ingresos SET club_id = v_gibbor_id WHERE club_id IS NULL;
     UPDATE asistencias SET club_id = v_gibbor_id WHERE club_id IS NULL;
     UPDATE eventos SET club_id = v_gibbor_id WHERE club_id IS NULL;
     UPDATE evaluaciones_tecnicas SET club_id = v_gibbor_id WHERE club_id IS NULL;
     UPDATE categorias SET club_id = v_gibbor_id WHERE club_id IS NULL;
     UPDATE configuracion_wa SET club_id = v_gibbor_id WHERE club_id IS NULL;
     UPDATE mensajes_wa SET club_id = v_gibbor_id WHERE club_id IS NULL;
  END IF;
END $$;
