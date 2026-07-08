import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: No llamar a getUser() si no es necesario para ahorrar latencia, 
  // pero para seguridad real es obligatorio.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // 1. Si no hay usuario y trata de entrar a rutas protegidas, al login
  if (!user && (
    url.pathname.startsWith('/director') || 
    url.pathname.startsWith('/entrenador') || 
    url.pathname.startsWith('/futbolista') ||
    url.pathname.startsWith('/admin')
  )) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 2. Control de Roles (Protección de nivel Senior)
  if (user) {
    // Para no hacer una consulta a BD en CADA request del middleware (que añade latencia),
    // podrías usar el JWT si incluyes el rol ahí. 
    // Por ahora, lo haremos seguro consultando el perfil.
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    const rol = perfil?.rol

    if (url.pathname.startsWith('/director') && rol !== 'Director') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    if (url.pathname.startsWith('/entrenador') && rol !== 'Entrenador' && rol !== 'Director') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (url.pathname.startsWith('/admin') && rol !== 'SuperAdmin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}
