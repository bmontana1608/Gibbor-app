import { NextResponse, type NextRequest } from 'next/server'

/**
 * MIDDLEWARE MULTITENANT (Rutas y Subdominios)
 * Soporta: 
 * 1. Rutas: portalgibbor.vercel.app/gibbor/director
 * 2. Subdominios: gibbor.portalgibbor.vercel.app/director
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const pathname = url.pathname;

  // 1. OMITIR RUTAS ESTÁTICAS Y DE API
  if (
    pathname.includes('.') || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin')
  ) {
    return NextResponse.next();
  }

  // 2. DETECCIÓN POR RUTA (/gibbor/director)
  const pathParts = pathname.split('/').filter(Boolean);
  const firstSegment = pathParts[0];

  // Lista de rutas reservadas que NO son slugs de clubes
  const reservedPath = ['director', 'entrenador', 'futbolista', 'login', 'perfil'];
  
  let slug = '';
  let finalUrl = url;

  if (firstSegment && !reservedPath.includes(firstSegment)) {
    // ES UN SLUG (ej: /gibbor/director)
    slug = firstSegment;
    // Reescribimos internamente: /gibbor/director -> /director
    const newPathname = '/' + pathParts.slice(1).join('/');
    finalUrl.pathname = newPathname || '/';
  } else {
    // DETECCIÓN POR SUBDOMINIO O DEFAULT
    const parts = hostname.split('.');
    if (hostname.includes('portalgibbor.vercel.app')) {
      slug = 'gibbor';
    } else if (parts.length > 2 && parts[0] !== 'www') {
      slug = parts[0];
    } else {
      slug = 'gibbor'; // Fallback para Gibbor
    }
  }

  // 3. INYECTAR SLUG EN LA CABECERA PARA EL SERVIDOR
  // Usamos rewrite para que el servidor vea la ruta limpia pero el cliente vea la ruta con slug
  const response = NextResponse.rewrite(finalUrl);
  response.headers.set('x-tenant-slug', slug);
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
