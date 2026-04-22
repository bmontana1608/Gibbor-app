import { NextResponse, type NextRequest } from 'next/server'

/**
 * MIDDLEWARE MULTITENANT
 * Detecta el subdominio e inyecta la cabecera x-tenant-slug 
 * para que el resto de la aplicación (Server Components, APIs)
 * sepa con qué club trabajar.
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''
  
  // 1. Lógica de detección de subdominio
  const parts = hostname.split('.')
  let slug = 'master'

  // Mapeo para producción
  if (hostname.includes('portalgibbor.vercel.app')) {
    slug = 'gibbor'
  } else if (parts.length > 2 && parts[0] !== 'www' && !hostname.includes('localhost')) {
    slug = parts[0]
  } else if (hostname.includes('lvh.me')) {
    // Si usas lvh.me para local, el subdominio es el primero
    slug = parts[0]
  }

  // 2. Inyectar el slug en las cabeceras (para Server Components)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', slug)

  // 3. Continuar la petición con las nuevas cabeceras
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

// Configurar en qué rutas se corre el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
