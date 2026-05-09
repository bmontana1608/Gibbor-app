import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import EntrenadorLayoutClient from './EntrenadorLayoutClient';

export default async function EntrenadorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') || 'gibbor';

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

  return (
    <EntrenadorLayoutClient initialTenant={tenant} initialProfile={perfil}>
      {children}
    </EntrenadorLayoutClient>
  );
}
