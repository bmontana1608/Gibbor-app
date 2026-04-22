import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const pathname = url.pathname;

  // 1. IGNORAR ARCHIVOS Y API
  if (
    pathname.includes('.') || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // 2. DETECCIÓN DE SLUG POR RUTA
  const pathParts = pathname.split('/').filter(Boolean);
  const reservedPaths = ['director', 'entrenador', 'futbolista', 'login', 'perfil', 'api', 'admin'];
  
  let slug = '';
  let finalPathname = pathname;

  if (pathParts.length > 0 && !reservedPaths.includes(pathParts[0])) {
    // Caso: /gibbor/director -> slug=gibbor, path=/director
    slug = pathParts[0];
    finalPathname = '/' + pathParts.slice(1).join('/');
    if (finalPathname === '/') finalPathname = '/'; // Manejar landing de club
  } else {
    // Caso: /director (sin slug) -> usamos Gibbor por defecto o subdominio
    if (hostname.includes('portalgibbor.vercel.app')) {
      slug = 'gibbor';
    } else {
      const parts = hostname.split('.');
      slug = parts.length > 2 && parts[0] !== 'www' ? parts[0] : 'gibbor';
    }
  }

  // 3. REWRITE CON CABECERAS DE REQUEST (Vital para Vercel)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', slug);

  // Reescribimos la URL internamente a la ruta limpia
  url.pathname = finalPathname;

  return NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!api|admin|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
