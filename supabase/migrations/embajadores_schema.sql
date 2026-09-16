-- 1. Modificar tabla configuracion_superadmin
ALTER TABLE configuracion_superadmin 
ADD COLUMN IF NOT EXISTS comision_primer_pago_porcentaje NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS comision_recurrente_porcentaje NUMERIC DEFAULT 10;

-- 2. Modificar tabla solicitudes_club
ALTER TABLE solicitudes_club
ADD COLUMN IF NOT EXISTS codigo_referido TEXT;

-- 3. Crear tabla embajadores
CREATE TABLE IF NOT EXISTS embajadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES perfiles(id),
  embajador_padre_id UUID REFERENCES embajadores(id),
  empresa TEXT,
  tipo TEXT CHECK (tipo IN ('Proveedor', 'Organizador', 'Entrenador', 'Escuela Aliada', 'Vendedor Independiente', 'Otro')),
  codigo_referido TEXT UNIQUE NOT NULL,
  estado TEXT DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Activo', 'Suspendido')),
  mostrar_en_directorio BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para embajadores
ALTER TABLE embajadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access para directorio" ON embajadores FOR SELECT USING (true);
CREATE POLICY "Embajadores ven su propio perfil" ON embajadores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "SuperAdmins gestionan embajadores" ON embajadores USING (
  EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'Super Admin')
);

-- 4. Modificar tabla clubes
ALTER TABLE clubes
ADD COLUMN IF NOT EXISTS embajador_id UUID REFERENCES embajadores(id),
ADD COLUMN IF NOT EXISTS estado_referido TEXT CHECK (estado_referido IN ('Registrado', 'Demo', 'Cliente Activo', 'Suspendido', 'Cancelado')),
ADD COLUMN IF NOT EXISTS fecha_activacion TIMESTAMP WITH TIME ZONE;

-- 5. Crear tabla comisiones
CREATE TABLE IF NOT EXISTS comisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embajador_id UUID REFERENCES embajadores(id) NOT NULL,
  club_id UUID REFERENCES clubes(id) NOT NULL,
  factura_id UUID REFERENCES facturacion_mensual(id),
  monto NUMERIC NOT NULL,
  porcentaje_aplicado NUMERIC NOT NULL,
  tipo_comision TEXT CHECK (tipo_comision IN ('primer_pago', 'recurrente')),
  estado TEXT DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pagada')),
  fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_pago TIMESTAMP WITH TIME ZONE,
  comprobante_pago TEXT,
  observaciones TEXT
);

-- Habilitar RLS para comisiones
ALTER TABLE comisiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Embajadores ven sus comisiones" ON comisiones FOR SELECT USING (
  embajador_id IN (SELECT id FROM embajadores WHERE user_id = auth.uid())
);
CREATE POLICY "SuperAdmins gestionan comisiones" ON comisiones USING (
  EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'Super Admin')
);

-- 6. Actualizar constraint de roles en perfiles (Si existe un constraint para 'rol', lo recreamos)
-- Nota: Esto asume que el constraint se llama perfiles_rol_check. Si no tiene constraint y es solo TEXT, no hay que hacer nada.
-- Para evitar errores, simplemente se asume que 'rol' es TEXT en Supabase. Si hay Enum, habría que alterar el tipo.

