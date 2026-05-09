import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fallback público absoluto (logo de MCM, siempre accesible)
const DEFAULT_ICON = 'https://cdn-icons-png.flaticon.com/512/1162/1162815.png';

export async function GET(
  request: Request,
  context: any
) {
  // Extraer slug del tenant desde los params del segmento dinámico
  const { tenant: slug } = await context.params;

  // Esta ruta es PÚBLICA — el navegador la lee sin autenticación para mostrar el banner de instalación
  const { data: club } = await supabaseAdmin
    .from('clubes')
    .select('nombre, nombre_corto, color_primario, logo_url')
    .eq('slug', slug)
    .single();

  // Construir URL base para iconos absolutos (requisito de algunos navegadores)
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  const clubName = club?.nombre || 'Club Deportivo';
  const clubShortName = club?.nombre_corto || clubName.split(' ')[0] || 'Club';
  const clubColor = club?.color_primario || '#06b6d4';

  // Garantizar que el icono sea una URL absoluta y válida
  let clubLogo = club?.logo_url;
  if (!clubLogo || (!clubLogo.startsWith('http://') && !clubLogo.startsWith('https://'))) {
    // Si es ruta relativa o no existe, usar icono absoluto de fallback
    clubLogo = clubLogo?.startsWith('/') ? `${origin}${clubLogo}` : DEFAULT_ICON;
  }

  const manifest = {
    name: clubName,
    short_name: clubShortName,
    description: `Portal oficial de ${clubName}`,
    start_url: `/${slug}/login`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#020617',
    theme_color: clubColor,
    scope: `/${slug}/`,
    lang: 'es',
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
      // Icono de respaldo garantizado
      {
        src: DEFAULT_ICON,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };

  return new NextResponse(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      // Sin autenticación requerida — acceso público explícito
      'Access-Control-Allow-Origin': '*',
    },
  });
}
