import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { enviarMensajeWhatsAppServer } from '@/lib/whatsappServer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { evento_id, convocado_id, club_slug } = await request.json();

    if (!evento_id || !convocado_id) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    // Obtener datos del evento
    const { data: evento, error: errorEvento } = await supabaseAdmin
      .from('eventos')
      .select('*')
      .eq('id', evento_id)
      .single();

    if (errorEvento) throw errorEvento;

    // Obtener datos del convocado
    const { data: convocado, error: errorConvocado } = await supabaseAdmin
      .from('convocatorias')
      .select(`
        id,
        rol_partido,
        perfiles (
          id,
          nombres,
          apellidos,
          telefono,
          grupos
        )
      `)
      .eq('id', convocado_id)
      .single();

    if (errorConvocado) throw errorConvocado;

    const perfil = convocado.perfiles as any;
    if (!perfil) throw new Error('Perfil no encontrado');

    if (!perfil.telefono) {
      return NextResponse.json({ error: 'El jugador no tiene un teléfono registrado' }, { status: 400 });
    }

    // Obtener datos del club e instancia de WhatsApp
    let club: any = null;
    if (evento.club_id) {
      const { data: clubData } = await supabaseAdmin
        .from('clubes')
        .select('id, nombre, slug, pais')
        .eq('id', evento.club_id)
        .single();
      club = clubData;
    } else if (club_slug) {
      const { data: clubData } = await supabaseAdmin
        .from('clubes')
        .select('id, nombre, slug, pais')
        .eq('slug', club_slug)
        .single();
      club = clubData;
    }

    let finalInstanceName = club?.slug || club_slug;
    if (club?.id) {
      const { data: configWa } = await supabaseAdmin
        .from('configuracion_wa')
        .select('instance_name')
        .eq('club_id', club.id)
        .maybeSingle();
      if (configWa?.instance_name) {
        finalInstanceName = configWa.instance_name;
      }
    }

    const clubNombre = club?.nombre || 'Nuestro Club';

    const titulo = evento.titulo;
    const nombreCompleto = `${perfil.nombres} ${perfil.apellidos}`;
    const rol = convocado.rol_partido.toUpperCase();
    const categoria = (perfil.grupos || '').replace('|MANUAL', '').trim() || 'Tu Categoría';
    const notasExtra = evento.descripcion ? `\n\n📌 *Notas del Entrenador:*\n${evento.descripcion}` : '';
    
    const mensaje = `⚽ *¡ATENCIÓN FAMILIA ${clubNombre.toUpperCase()}!* 🎉\n\nNos complace informarles que *${nombreCompleto}* (Categoría: ${categoria}) ha sido oficialmente CONVOCADO para representar a *${clubNombre}* en:\n\n🏆 *${titulo}*\n📅 Fecha: ${evento.fecha}\n⏰ Hora: ${evento.hora}\n📍 Lugar: ${evento.lugar || 'Por definir'}\n\nSu rol en este encuentro: *${rol}* ⭐${notasExtra}\n\nValoramos su talento y disciplina dentro del terreno de juego, sabemos que representará con orgullo a nuestro club. ¡Los esperamos! 💪🔥`;

    const result = await enviarMensajeWhatsAppServer(
      perfil.telefono,
      mensaje,
      undefined,
      'document',
      '',
      finalInstanceName,
      club?.pais
    );

    if (result.success) {
      // Actualizar estado de notificación
      await supabaseAdmin
        .from('convocatorias')
        .update({ estado_notificacion: 'Enviada' })
        .eq('id', convocado.id);
        
      return NextResponse.json({ success: true, mensaje: 'Notificación enviada con éxito por WhatsApp' });
    } else {
      throw new Error(result.error || 'Error al enviar por WhatsApp');
    }

  } catch (error: any) {
    console.error("Error notificando jugador manualmente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
