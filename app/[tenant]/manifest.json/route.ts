import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  context: any
) {
  const { tenant: slug } = await context.params;

  // Obtener datos del club para branding nativo
  const { data: club } = await supabaseAdmin
    .from('clubes')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!club) {
    return NextResponse.json({ error: 'Club not found' }, { status: 404 });
  }

  const clubName = club.nombre || 'Gibbor App';
  const clubShortName = club.nombre_corto || clubName.split(' ')[0];
  const clubColor = club.color_primario || '#ea580c';
  const clubLogo = club.logo_url || '/logo.png';

  const manifest = {
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
        purpose: 'any maskable',
      },
      {
        src: clubLogo,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  });
}
