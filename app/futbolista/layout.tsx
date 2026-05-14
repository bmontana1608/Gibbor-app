import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import FutbolistaLayoutClient from './FutbolistaLayoutClient';

export default async function FutbolistaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') || 'default';

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
      {children}
    </FutbolistaLayoutClient>
  );
}
