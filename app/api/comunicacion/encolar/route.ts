import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { club_id, creador_id, titulo, mensaje, audiencia, metodos } = body;

    if (!club_id || !mensaje || !audiencia || !metodos || !Array.isArray(metodos)) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const { data: tenant, error: tErr } = await supabaseAdmin.from('clubes').select('slug').eq('id', club_id).single();
    if (tErr || !tenant) return NextResponse.json({ error: 'Club no válido' }, { status: 400 });

    let countWhatsapp = 0;
    let countInApp = 0;

    // 1. Enviar In-App (si se seleccionó)
    if (metodos.includes('inapp')) {
      const { error: inAppErr } = await supabaseAdmin.from('comunicados').insert({
        club_id,
        creador_id,
        titulo: titulo || 'Aviso Importante',
        mensaje,
        audiencia,
        estado: 'Activo'
      });
      if (inAppErr) throw inAppErr;
      countInApp = 1;
    }

    // 2. Encolar para WhatsApp (si se seleccionó)
    if (metodos.includes('whatsapp')) {
      // a. Obtener todos los jugadores destino basados en la audiencia
      let query = supabaseAdmin
        .from('perfiles')
        .select('id, telefono, email_contacto')
        .eq('club_id', club_id)
        .eq('estado_miembro', 'Activo');

      if (audiencia !== 'Todos' && audiencia !== 'Deudores') {
        // Filtrar por categoría (grupos)
        query = query.like('grupos', `${audiencia}%`);
      } else if (audiencia === 'Deudores') {
        query = query.eq('estado_pago', 'Pendiente');
      }

      const { data: destinatarios, error: destErr } = await query;
      
      if (destErr) throw destErr;

      if (destinatarios && destinatarios.length > 0) {
        // b. Preparar registros para la cola
        const queueData = [];
        for (const dest of destinatarios) {
          // Si no tiene teléfono, no se puede enviar WA
          if (!dest.telefono || dest.telefono.trim() === '') continue;
          
          queueData.push({
            club_id,
            destinatario_id: dest.id,
            telefono_destino: dest.telefono,
            mensaje,
            estado: 'Pendiente'
          });
        }

        // c. Insertar lote en mensajes_cola
        if (queueData.length > 0) {
          const { error: insertErr } = await supabaseAdmin.from('mensajes_cola').insert(queueData);
          if (insertErr) throw insertErr;
          countWhatsapp = queueData.length;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      resumen: {
        whatsapp_encolados: countWhatsapp,
        inapp_creados: countInApp
      }
    });

  } catch (error: any) {
    console.error('[API Comunicacion]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
