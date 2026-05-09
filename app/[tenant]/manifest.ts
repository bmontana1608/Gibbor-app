import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT_ICON = 'https://cdn-icons-png.flaticon.com/512/1162/1162815.png';

export default async function manifest({
  params,
}: any): Promise<MetadataRoute.Manifest> {
  const { tenant: slug } = await params;

  const { data: club } = await supabaseAdmin
    .from('clubes')
    .select('nombre, nombre_corto, color_primario, logo_url')
    .eq('slug', slug)
    .single();

  const clubName = club?.nombre || 'Club Deportivo';
  const clubShortName = club?.nombre_corto || clubName.split(' ')[0] || 'Club';
  const clubColor = club?.color_primario || '#06b6d4';

  // Icono con fallback garantizado (URL absoluta o fallback público)
  let clubLogo = club?.logo_url;
  if (!clubLogo || (!clubLogo.startsWith('http://') && !clubLogo.startsWith('https://'))) {
    clubLogo = DEFAULT_ICON;
  }

  return {
    name: clubName,
    short_name: clubShortName,
    description: `Portal oficial de ${clubName}`,
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
