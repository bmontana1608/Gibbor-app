import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import FutbolistaLayoutClient from './FutbolistaLayoutClient';
import SaaSSuspendidoView from '@/components/SaaSSuspendidoView';

export default async function FutbolistaLayout({ children }: { children: React.ReactNode }) {
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

  let wppNumber = '+573124265170';
  let activeAthletesCount = 0;
  let activePlanes: any[] = [];
  
  if (isSuspended) {
    const { data: configAdmin } = await supabase.from('configuracion_superadmin').select('telefono_soporte').single();
    if (configAdmin?.telefono_soporte) wppNumber = configAdmin.telefono_soporte;

    const { data: planes } = await supabase.from('planes_saas').select('*').eq('activo', true).order('precio_base', { ascending: true });
    if (planes) activePlanes = planes;

    const { count } = await supabase
      .from('perfiles')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', (tenant as any)?.id)
      .eq('rol', 'Futbolista')
      .eq('estado_miembro', 'Activo');
    
    if (count) activeAthletesCount = count;
  }

  // Cargar familia (Lógica existente simplificada para servidor)
  const cleanEmail = user.email?.trim().replace(/\.+@/g, '@').replace(/\.+$/,'');
  const { data: misPerfiles } = await supabase
    .from('perfiles')
    .select('*')
    .or(`email.eq.${cleanEmail},id.eq.${user.id}`);

  return (
    <FutbolistaLayoutClient 
      initialTenant={tenant} 
      initialProfile={perfil}
      initialFamily={misPerfiles || []}
    >
      {isSuspended ? (
        <SaaSSuspendidoView 
          club={tenant} 
          planes={activePlanes}
          wppNumber={wppNumber} 
          activeAthletesCount={activeAthletesCount || 1}
        />
      ) : (
        children
      )}
    </FutbolistaLayoutClient>
  );
}
