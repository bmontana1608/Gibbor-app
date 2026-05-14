import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import DirectorLayoutClient from './DirectorLayoutClient';

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') || 'default';

  // 1. VERIFICACIÓN DE SESIÓN (SERVER-SIDE)
  // Esto evita el flickering visual porque el servidor redirige antes de enviar HTML.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect(`/${tenantSlug}/login`);
  }

  // 2. OBTENER DATOS DEL TENANT Y PERFIL
  const { getTenant } = await import('@/lib/tenant');
  const tenant = await getTenant(tenantSlug);

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // 3. VALIDACIÓN DE PERMISOS
  const userRole = perfil?.rol?.toLowerCase();
  const isSuperAdmin = userRole === 'superadmin';
  const isDirector = userRole === 'director';
  const belongsToClub = perfil?.club_id === (tenant as any)?.id;

  if (!isSuperAdmin && (!isDirector || !belongsToClub)) {
    console.error("Acceso bloqueado en servidor: ", { userRole, clubId: perfil?.club_id, tenantId: (tenant as any)?.id });
    return redirect('/');
  }

  return (
    <DirectorLayoutClient initialTenant={tenant} initialProfile={perfil}>
      {children}
    </DirectorLayoutClient>
  );
}