import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/proxy'

/**
 * GIBBOR CLOUD PROXY (MULTICLUB + AUTH)
 * Este archivo centraliza la seguridad y la detección de tenants (Saas).
 */
export async function proxy(request: NextRequest) {
  // 1. Lógica Multiclub (Tenant Detection)
  const hostname = request.headers.get('host') || '';
  const parts = hostname.split('.');
  
  let subdomain = parts.length > 2 ? parts[0] : null;

  // 2. Inyectamos los datos MODO PRE-REQUEST para Server Components y Ruteadores
  if (subdomain && subdomain !== 'www') {
    request.headers.set('x-tenant-slug', subdomain);
  } else {
    request.headers.set('x-tenant-slug', 'master');
  }

  // 3. Manejamos la sesión de Supabase (Auth) pasándole el request modificado
  const response = await updateSession(request);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
