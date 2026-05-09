import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function manifest({
  params,
}: any): Promise<MetadataRoute.Manifest> {
  const { tenant: slug } = await params;

  // Obtener datos del club
  const { data: club } = await supabaseAdmin
    .from('clubes')
    .select('*')
    .eq('slug', slug)
    .single();

  const clubName = club?.nombre || 'Gibbor App';
  const clubShortName = club?.nombre_corto || clubName.split(' ')[0];
  const clubColor = club?.color_primario || '#ea580c';
  const clubLogo = club?.logo_url || '/logo.png';

  return {
    name: clubName,
    short_name: clubShortName,
    description: `Plataforma oficial de ${clubName}`,
    start_url: `/${slug}/login`,
    display: 'standalone',
    background_color: '#020617',
    theme_color: clubColor,
    scope: `/${slug}/`,
    icons: [
      {
        src: clubLogo,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: clubLogo,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
