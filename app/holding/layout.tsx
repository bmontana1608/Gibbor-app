import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import HoldingLayoutClient from './HoldingLayoutClient';
import { createClient as createAdmin } from '@supabase/supabase-js';

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function HoldingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug');

  // 1. Verificar sesión
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect(`/${tenantSlug}/login`);
  }

  // 2. Buscar el holding por slug (el tenantSlug para holding es el slug del holding)
  const { data: holding, error: holdingError } = await supabaseAdmin
    .from('holdings')
    .select('*')
    .eq('slug', tenantSlug)
    .single();

  if (holdingError || !holding) {
    return redirect('/');
  }

  // 3. Verificar que el usuario sea el dueño del holding o SuperAdmin
  const { data: perfil } = await supabaseAdmin
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const isSuperAdmin = perfil?.rol === 'SuperAdmin';
  const isOwner = holding.owner_id === user.id;

  if (!isOwner && !isSuperAdmin) {
    return redirect('/');
  }

  return (
    <HoldingLayoutClient holding={holding} perfil={perfil}>
      {children}
    </HoldingLayoutClient>
  );
}
