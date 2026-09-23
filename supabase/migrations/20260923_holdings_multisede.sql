-- ============================================================
-- MIGRACIÓN: MÓDULO HOLDING (MULTI-SEDE)
-- Compatible con clientes existentes (holding_id es NULLABLE)
-- ============================================================

-- 1. Crear tabla holdings
CREATE TABLE IF NOT EXISTS public.holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  color_primario TEXT DEFAULT '#10b981',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Añadir holding_id a clubes (nullable para no afectar clientes existentes)
ALTER TABLE public.clubes ADD COLUMN IF NOT EXISTS holding_id UUID REFERENCES public.holdings(id) ON DELETE SET NULL;

-- 3. Índices para eficiencia
CREATE INDEX IF NOT EXISTS idx_clubes_holding_id ON public.clubes(holding_id);
CREATE INDEX IF NOT EXISTS idx_holdings_owner_id ON public.holdings(owner_id);
CREATE INDEX IF NOT EXISTS idx_holdings_slug ON public.holdings(slug);

-- 4. RLS Policies para holdings
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

-- El dueño puede ver su propio holding
CREATE POLICY "owner_can_view_holding" ON public.holdings
  FOR SELECT USING (owner_id = auth.uid());

-- El dueño puede actualizar su holding
CREATE POLICY "owner_can_update_holding" ON public.holdings
  FOR UPDATE USING (owner_id = auth.uid());

-- SuperAdmin puede ver todos los holdings
CREATE POLICY "superadmin_can_view_all_holdings" ON public.holdings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.perfiles 
      WHERE id = auth.uid() AND rol = 'SuperAdmin'
    )
  );

-- SuperAdmin puede crear holdings
CREATE POLICY "superadmin_can_insert_holding" ON public.holdings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles 
      WHERE id = auth.uid() AND rol = 'SuperAdmin'
    )
  );

-- 5. Updated_at trigger
CREATE OR REPLACE FUNCTION update_holdings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_holdings_updated_at ON public.holdings;
CREATE TRIGGER update_holdings_updated_at
  BEFORE UPDATE ON public.holdings
  FOR EACH ROW EXECUTE FUNCTION update_holdings_updated_at();
