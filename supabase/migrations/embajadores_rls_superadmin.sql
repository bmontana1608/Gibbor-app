-- 1. Políticas RLS para SuperAdmin en la tabla embajadores
CREATE POLICY "SuperAdmin full access embajadores" ON public.embajadores
FOR ALL 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'superadmin')
) 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'superadmin')
);

-- 2. Políticas RLS para SuperAdmin en la tabla comisiones
CREATE POLICY "SuperAdmin full access comisiones" ON public.comisiones
FOR ALL 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'superadmin')
) 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'superadmin')
);

-- Si la tabla embajadores necesita permitir INSERTS desde el formulario público (masterclubmanager.com/unete-embajador)
-- Hay que asegurarnos que pueda insertarse sin login, o si lo hace el backend, no hay problema porque el backend usa service_role_key.
-- En nuestro caso, el Super Admin inserta usando su sesión.
