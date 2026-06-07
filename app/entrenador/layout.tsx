import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import EntrenadorLayoutClient from './EntrenadorLayoutClient';

export default async function EntrenadorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug');

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect(`/${tenantSlug}/login`);
  }

  const { getTenant } = await import('@/lib/tenant');
  const tenant = await getTenant(tenantSlug);

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!perfil) {
    return redirect(`/${tenantSlug}/login`);
  }

  // VALIDACIÓN DE SEGURIDAD: El entrenador debe pertenecer al club activo
  const isSuperAdmin = perfil?.rol?.toLowerCase() === 'superadmin';
  const isStaff = ['director', 'entrenador'].includes(perfil?.rol?.toLowerCase());
  const belongsToClub = perfil?.club_id === (tenant as any)?.id;

  if (!isSuperAdmin && (!isStaff || !belongsToClub)) {
    console.error('[Entrenador Layout] Acceso denegado:', { rol: perfil?.rol, clubId: perfil?.club_id, tenantId: (tenant as any)?.id });
    return redirect(`/${tenantSlug}/login`);
  }

  return (
    <EntrenadorLayoutClient initialTenant={tenant} initialProfile={perfil}>
      {children}
    </EntrenadorLayoutClient>
  );
}
