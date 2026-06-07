import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import EntrenadorLayoutClient from './EntrenadorLayoutClient';
import SaaSSuspendidoView from '@/components/SaaSSuspendidoView';

export default async function EntrenadorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug');
  const isSuspended = headersList.get('x-club-suspended') === 'true';

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

  let wppNumber = '+573124265170';
  let activeAthletesCount = 0;
  if (isSuspended) {
    const { data: configAdmin } = await supabase.from('configuracion_superadmin').select('telefono_soporte').single();
    if (configAdmin?.telefono_soporte) wppNumber = configAdmin.telefono_soporte;

    const { count } = await supabase
      .from('perfiles')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', (tenant as any)?.id)
      .eq('rol', 'Futbolista')
      .eq('estado_miembro', 'Activo');
    
    if (count) activeAthletesCount = count;
  }

  return (
    <EntrenadorLayoutClient initialTenant={tenant} initialProfile={perfil}>
      {isSuspended ? (
        <SaaSSuspendidoView 
          club={tenant} 
          tarifaBase={Number((tenant as any)?.tarifa_por_jugador || 2000)} 
          wppNumber={wppNumber} 
          activeAthletesCount={activeAthletesCount || 1}
        />
      ) : (
        children
      )}
    </EntrenadorLayoutClient>
  );
}
