import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const pathname = url.pathname;

  // 1. IGNORAR ARCHIVOS ESTÁTICOS Y RUTAS PÚBLICAS CRÍTICAS
  if (
    pathname.includes('.') || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/admin') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.endsWith('/manifest.json') ||
    pathname.endsWith('/manifest.webmanifest') ||
    pathname === '/sw.js'
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
    const subPath = pathParts[1];
    
    // EXCEPCIÓN: Si es la página de registro 'unete', no reescribimos para usar el ruteo dinámico de [tenant]
    if (subPath === 'unete') {
      finalPathname = pathname;
    } else {
      finalPathname = '/' + pathParts.slice(1).join('/');
    }
    
    if (finalPathname === '/') finalPathname = '/'; 
  } else {
    // DETECCIÓN POR SUBDOMINIO
    const parts = hostname.split('.');
    
    if (parts.length > 2 && parts[0] !== 'www') {
      // Si el subdominio es portalgibbor, lo tratamos como gibbor
      slug = parts[0] === 'portalgibbor' ? 'gibbor' : parts[0];
    } else {
      // Dominio principal (Cargar Gibbor por defecto para la PWA existente)
      slug = 'gibbor'; 
    }
  }

  // 3. REWRITE CON CABECERAS DE REQUEST (Vital para Vercel)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', slug);

  // 4. PROTECCIÓN DE RUTAS: REDIRECCIÓN INMEDIATA SI NO HAY SESIÓN
  const protectedRoutes = ['/director', '/entrenador', '/futbolista'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isLoginPage = pathname.includes('/login');

  if (isProtectedRoute && !isLoginPage) {
    const sessionCookie = request.cookies.get('sb-access-token') || request.cookies.get('supabase-auth-token');
    // Nota: El nombre exacto depende de la config de Supabase, 
    // pero usualmente buscamos la presencia de cualquier cookie de sesión.
    // Si no hay cookies de auth, redirigir al login del tenant.
    if (!sessionCookie) {
      const loginUrl = new URL(`/${slug}/login`, request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 5. SAAS GUARD: BLOQUEO POR MORA
  // Solo bloqueamos rutas operativas (director, entrenador)
  const isOperationalRoute = pathname.startsWith('/director') || pathname.startsWith('/entrenador');
  const isSuspendedPage = pathname.includes('/suspendido');

  if (isOperationalRoute && !isSuspendedPage && slug) {
    try {
      // Usamos fetch directo a la API de Supabase para mayor velocidad en Middleware
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      // Consultar estado del club
      const clubRes = await fetch(`${supabaseUrl}/rest/v1/clubes?slug=eq.${slug}&select=estado_suscripcion`, {
        headers: { 'apikey': supabaseKey!, 'Authorization': `Bearer ${supabaseKey}` }
      });
      const clubData = await clubRes.json();
      const estado = clubData?.[0]?.estado_suscripcion || 'activo';

      if (estado === 'suspendido') {
        // Verificar si es SuperAdmin para permitir el paso
        const cookieHeader = request.headers.get('Cookie') || '';
        const accessToken = request.cookies.get('sb-access-token')?.value;
        
        if (accessToken) {
          const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: { 'apikey': supabaseKey!, 'Authorization': `Bearer ${accessToken}` }
          });
          const userData = await userRes.json();
          const userId = userData?.id;

          if (userId) {
            const profileRes = await fetch(`${supabaseUrl}/rest/v1/perfiles?id=eq.${userId}&select=rol`, {
              headers: { 'apikey': supabaseKey!, 'Authorization': `Bearer ${supabaseKey}` }
            });
            const profileData = await profileRes.json();
            const rol = profileData?.[0]?.rol;

            // EXCEPCIÓN: SuperAdmin siempre entra
            if (rol !== 'SuperAdmin') {
              return NextResponse.redirect(new URL(`/${slug}/suspendido`, request.url));
            }
          }
        }
      }
    } catch (e) {
      console.error('Middleware SaaS Guard Error:', e);
    }
  }

  // Si la ruta final es la misma que la original, hacemos un next() normal
  if (finalPathname === pathname) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } else {
    url.pathname = finalPathname;
    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
  }
}

export const config = {
  matcher: [
    '/((?!api|admin|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
