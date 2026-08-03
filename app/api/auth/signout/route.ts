import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  // Obtener el origen para redirigir (referer) o usar la raíz
  const referer = request.headers.get('referer');
  
  // Cerrar la sesión en Supabase
  await supabase.auth.signOut();

  // Si estaba en embajador, mandarlo a la raíz, si no a la raíz o referer.
  // El usuario solicitó específicamente que redirija a la raíz para embajadores.
  const redirectUrl = new URL('/', request.url);
  
  return NextResponse.redirect(redirectUrl, {
    status: 302,
  });
}
