import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { titulo, mensaje, url } = await req.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
    if (perfil?.rol !== 'Director') return NextResponse.json({ error: 'Solo el director puede enviar alertas' }, { status: 403 });

    // Configurar web-push SOLO cuando se va a usar (Lazy Loading)
    // Esto evita errores durante el build de Vercel
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Las llaves VAPID no están configuradas en el servidor' }, { status: 500 });
    }

    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:admin@efdgibbor.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    // 1. Obtener todos los suscritos
    const { data: subscripciones, error } = await supabase.from('push_subscriptions').select('*');
    if (error) throw error;

    if (!subscripciones || subscripciones.length === 0) {
      return NextResponse.json({ message: 'No hay usuarios suscritos todavía' });
    }

    // 2. Enviar a cada uno
    const notifications = subscripciones.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: titulo,
            body: mensaje,
            url: url || '/'
          })
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    });

    await Promise.all(notifications);

    // 3. Guardar en la tabla de notificaciones para que aparezca en la campana
    await supabase.from('notificaciones_app').insert({
      titulo,
      mensaje,
      tipo: 'comunicado'
    });

    return NextResponse.json({ success: true, count: subscripciones.length });

  } catch (error: any) {
    console.error('Error en broadcast:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
