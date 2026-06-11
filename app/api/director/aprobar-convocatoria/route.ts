import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { enviarMensajeWhatsApp } from '@/lib/whatsapp';

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
    // Necesitamos hacer join con perfiles para obtener el teléfono y el nombre
    const { data: convocados, error: errorConvocados } = await supabaseAdmin
      .from('convocatorias')
      .select(`
        id,
        rol_partido,
        perfiles (
          id,
          nombres,
          apellidos,
          telefono
        )
      `)
      .eq('evento_id', evento_id);

    if (errorConvocados) throw errorConvocados;

    // 3. Enviar WhatsApp a cada jugador
    let enviados = 0;
    let fallidos = 0;

    for (const convocado of convocados) {
      const perfil = convocado.perfiles as any;
      if (!perfil || !perfil.telefono) {
        fallidos++;
        continue;
      }

      // Mensaje cálido y motivador
      const titulo = evento.titulo;
      const nombre = perfil.nombres.split(' ')[0];
      const rol = convocado.rol_partido.toUpperCase();
      
      const mensaje = `⚽ *¡FELICITACIONES ${nombre}!* 🎉\n\nHas sido convocado oficialmente para formar parte de nuestra plantilla en:\n*🏆 ${titulo}*\n\nTu rol en este encuentro será de: *${rol}*.\n\nPor favor revisa tu plataforma para más detalles de fecha y lugar. ¡Contamos contigo! 💪`;

      // Enviar WhatsApp usando nuestro motor
      const result = await enviarMensajeWhatsApp(
        perfil.telefono,
        mensaje,
        undefined,
        'document',
        '',
        club_slug
      );

      if (result.success) {
        enviados++;
        // Marcar la notificación como enviada en la base de datos
        await supabaseAdmin
          .from('convocatorias')
          .update({ estado_notificacion: 'Enviada' })
          .eq('id', convocado.id);
      } else {
        fallidos++;
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
