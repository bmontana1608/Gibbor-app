import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente con Service Role Key para saltar RLS completamente
// El manifiesto es público — no requiere autenticación del usuario
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(
  request: Request,
  context: any
) {
  const { tenant: slug } = await context.params;

  // URL base del servidor para construir URLs absolutas de iconos locales
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  // Icono de respaldo local — mismo origen, Chrome confía en él
  const LOCAL_FALLBACK_ICON = `${origin}/logo.png`;

  let clubName = slug.toUpperCase(); // Fallback inteligente: el slug mismo
  let clubColor = '#06b6d4';
  let clubLogo = LOCAL_FALLBACK_ICON;

  try {
    // Traer todos los campos relevantes con supabaseAdmin (sin RLS)
    const { data: club, error } = await supabaseAdmin
      .from('clubes')
      .select('nombre, color_primario, logo_url')
      .eq('slug', slug)
      .maybeSingle(); // maybeSingle no lanza error si no hay resultado

    if (error) {
      console.error(`[manifest.json] Supabase error para slug "${slug}":`, error.message);
    }

    if (club) {
      clubName = club.nombre || clubName;
      clubColor = club.color_primario || clubColor;

      // Validar que logo_url sea una URL absoluta válida
      if (club.logo_url && (club.logo_url.startsWith('http://') || club.logo_url.startsWith('https://'))) {
        clubLogo = club.logo_url;
      } else if (club.logo_url && club.logo_url.startsWith('/')) {
        // Ruta relativa → convertir a absoluta
        clubLogo = `${origin}${club.logo_url}`;
      }
      // Si logo_url es null/empty → ya tenemos LOCAL_FALLBACK_ICON por defecto
    } else {
      console.warn(`[manifest.json] Club no encontrado para slug: "${slug}". Usando fallback.`);
    }
  } catch (err: any) {
    console.error(`[manifest.json] Error inesperado para slug "${slug}":`, err.message);
  }

  // Nombre corto: primeras 2 palabras del nombre, máx 12 chars
  const clubShortName = clubName.split(' ').slice(0, 2).join(' ').slice(0, 12);

  const manifest = {
    name: clubName,
    short_name: clubShortName,
    description: `Portal oficial de ${clubName}`,
    start_url: `/${slug}/login`,
    id: `/${slug}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#020617',
    theme_color: clubColor,
    scope: '/',
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
      // Segundo icono de respaldo local garantizado (mismo origen)
      {
        src: LOCAL_FALLBACK_ICON,
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
      'Access-Control-Allow-Origin': '*',
    },
  });
}
