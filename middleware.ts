import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const pathname = url.pathname;

  // 1. IGNORAR ARCHIVOS ESTÁTICOS Y RUTAS PÚBLICAS CRÍTICAS
  if (
    pathname.includes('.') || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/admin') ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.endsWith('/manifest.json') ||
    pathname.endsWith('/manifest.webmanifest') ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next();
  }

  // 2. DETECCIÓN DE SLUG POR RUTA O SUBDOMINIO
  const pathParts = pathname.split('/').filter(Boolean);
  const reservedPaths = ['director', 'entrenador', 'futbolista', 'login', 'perfil', 'api', 'admin', 'superadmin', 'registro-club', 'privacidad', 'terminos', 'flyer'];
  
  let slug = '';
  let finalPathname = pathname;

  if (pathParts.length > 0 && !reservedPaths.includes(pathParts[0])) {
    slug = pathParts[0];
    const subPath = pathParts[1];
    if (subPath === 'unete' || subPath === 'suspendido') {
      finalPathname = pathname;
    } else {
      finalPathname = '/' + pathParts.slice(1).join('/');
    }
    if (finalPathname === '/') finalPathname = '/'; 
  } else {
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      slug = parts[0] === 'portalgibbor' ? 'gibbor' : parts[0];
    } else {
      slug = 'master'; 
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', slug);

  // 3. LÓGICA DE BLOQUEO SAAS (SUSPENSIÓN)
  const isSuspendedPage = pathname.includes('/suspendido');
  const isApiRoute = pathname.startsWith('/api');
  const isLoginPage = pathname.includes('/login');

  // Solo evaluar bloqueo si estamos entrando al dashboard u operaciones (no en login ni suspendido)
  if (!isApiRoute && !isSuspendedPage && !isLoginPage && slug && slug !== 'master') {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Obtener datos del club
      const { data: clubData } = await supabase
        .from('clubes')
        .select('id, estado, estado_suscripcion, fecha_fin_prueba, proximo_corte')
        .eq('slug', slug)
        .single();

      if (clubData) {
        let isSuspended = clubData.estado_suscripcion === 'Suspendido' || clubData.estado === 'Suspendido';
        const hoy = new Date();

        // 1. Validar por el nuevo sistema de Próximo Corte
        if (clubData.proximo_corte) {
          const fechaCorte = new Date(clubData.proximo_corte);
          if (fechaCorte < hoy) {
             isSuspended = true;
          }
        } else {
          // 2. Lógica Legacy (si el club aún no tiene un corte asignado)
          const diaActual = hoy.getDate();
          const mesActual = hoy.getMonth() + 1;
          const anioActual = hoy.getFullYear();

          if (clubData.fecha_fin_prueba) {
            const fechaFinPrueba = new Date(clubData.fecha_fin_prueba);
            if (fechaFinPrueba < hoy) {
              isSuspended = true;
            }
          }

          if (!isSuspended && diaActual > 10) {
            const { data: facturas } = await supabase
              .from('facturacion_mensual')
              .select('estado_pago')
              .eq('club_id', clubData.id)
              .eq('periodo_mes', mesActual)
              .eq('periodo_anio', anioActual)
              .limit(1);

            const facturaMes = facturas?.[0];
            if (!facturaMes || facturaMes.estado_pago !== 'pagado') {
               isSuspended = true;
            }
          }
        }

        if (isSuspended) {
          // EXCEPCIÓN: Super Admin siempre entra
          const accessToken = request.cookies.get('sb-access-token')?.value;
          let isSuperAdmin = false;
          
          if (accessToken) {
             const { data: userData } = await supabase.auth.getUser(accessToken);
             if (userData?.user) {
                const { data: profile } = await supabase
                  .from('perfiles')
                  .select('rol')
                  .eq('id', userData.user.id)
                  .single();
                if (profile?.rol === 'SuperAdmin') {
                   isSuperAdmin = true;
                }
             }
          }

          if (!isSuperAdmin) {
            requestHeaders.set('x-club-suspended', 'true');
          } else {
            requestHeaders.set('x-club-suspended', 'false');
          }
        } else {
          requestHeaders.set('x-club-suspended', 'false');
        }
      }
    } catch (e) {
      console.error('Middleware SaaS Guard Error:', e);
    }
  }

  if (finalPathname === pathname) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    url.pathname = finalPathname;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }
}

export const config = {
  matcher: [
    '/((?!api|admin|superadmin|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
