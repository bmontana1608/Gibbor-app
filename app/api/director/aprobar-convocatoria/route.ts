import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { enviarMensajeWhatsAppServer } from '@/lib/whatsappServer';
import webpush from 'web-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { evento_id, club_slug } = await request.json();

    if (!evento_id) {
      return NextResponse.json({ error: 'Falta el ID del evento' }, { status: 400 });
    }

    // 1. Marcar el evento como Aprobado
    const { data: evento, error: errorEvento } = await supabaseAdmin
      .from('eventos')
      .update({ estado: 'Aprobado' })
      .eq('id', evento_id)
      .select()
      .single();

    if (errorEvento) throw errorEvento;

    // 2. Obtener los jugadores convocados y sus teléfonos
    const { data: convocados, error: errorConvocados } = await supabaseAdmin
      .from('convocatorias')
      .select(`
        id,
        rol_partido,
        estado_notificacion,
        perfiles (
          id,
          nombres,
          apellidos,
          telefono,
          grupos
        )
      `)
      .eq('evento_id', evento_id);

    if (errorConvocados) throw errorConvocados;

    // Configurar web-push
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:admin@efdgibbor.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }

    let enviados = 0;
    let fallidos = 0;

    for (const convocado of convocados) {
      const perfil = convocado.perfiles as any;
      if (!perfil) continue;

      // Saltar jugadores que ya fueron notificados en una aprobación previa
      if (convocado.estado_notificacion === 'Enviada') {
        continue;
      }

      const titulo = evento.titulo;
      const nombreCompleto = `${perfil.nombres} ${perfil.apellidos}`;
      const rol = convocado.rol_partido.toUpperCase();
      const categoria = (perfil.grupos || '').replace('|MANUAL', '').trim() || 'Tu Categoría';
      const notasExtra = evento.descripcion ? `\n\n📌 *Notas del Entrenador:*\n${evento.descripcion}` : '';
      
      // WhatsApp (si tiene teléfono)
      if (perfil.telefono) {
        const mensaje = `⚽ *¡ATENCIÓN FAMILIA GIBBOR!* 🎉\n\nNos complace informarles que *${nombreCompleto}* (Categoría: ${categoria}) ha sido oficialmente CONVOCADO para representar al club en:\n\n🏆 *${titulo}*\n📅 Fecha: ${evento.fecha}\n⏰ Hora: ${evento.hora}\n📍 Lugar: ${evento.lugar || 'Por definir'}\n\nSu rol en este encuentro: *${rol}* ⭐${notasExtra}\n\nValoramos su talento y disciplina dentro del terreno de juego, sabemos que representará bien al club. ¡Los esperamos! 💪🔥`;

        const result = await enviarMensajeWhatsAppServer(
          perfil.telefono,
          mensaje,
          undefined,
          'document',
          '',
          club_slug
        );

        if (result.success) {
          enviados++;
          await supabaseAdmin
            .from('convocatorias')
            .update({ estado_notificacion: 'Enviada' })
            .eq('id', convocado.id);
        } else {
          fallidos++;
        }
      } else {
        fallidos++;
      }

      // Notificación App (Dashboard)
      await supabaseAdmin.from('notificaciones_app').insert({
        titulo: '¡Convocatoria Confirmada!',
        mensaje: `Has sido convocado para: ${titulo}`,
        tipo: 'convocatoria',
        club_id: evento.club_id,
        jugador_id: perfil.id
      });

      // Push Notification Individual
      const { data: subscripciones } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', perfil.id);

      if (subscripciones && subscripciones.length > 0 && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        for (const sub of subscripciones) {
          try {
            await webpush.sendNotification(
              sub.subscription,
              JSON.stringify({
                title: '⚽ ¡Fuiste convocado!',
                body: `Revisa tu dashboard para ver los detalles de ${titulo}`,
                url: '/futbolista'
              })
            );
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      mensaje: `Evento aprobado. Mensajes enviados: ${enviados}, Fallidos: ${fallidos}` 
    });

  } catch (error: any) {
    console.error("Error aprobando convocatoria:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
