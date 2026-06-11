import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { evento, jugadores } = await request.json();

    if (!evento || !evento.club_id || !evento.creado_por || !evento.titulo) {
      return NextResponse.json({ error: 'Faltan datos del evento' }, { status: 400 });
    }

    // 1. Insertar Evento (Estado por defecto 'Pendiente')
    const { data: eventoGuardado, error: errorEvento } = await supabaseAdmin
      .from('eventos')
      .insert([{
        club_id: evento.club_id,
        creado_por: evento.creado_por,
        titulo: evento.titulo,
        descripcion: evento.descripcion || '',
        tipo: evento.tipo_evento,
        fecha: evento.fecha,
        lugar: evento.lugar,
        estado: 'Pendiente'
      }])
      .select()
      .single();

    if (errorEvento) throw errorEvento;

    // 2. Insertar Jugadores Convocados
    if (jugadores && jugadores.length > 0) {
      const convocatoriasPayload = jugadores.map((jugador: any) => ({
        evento_id: eventoGuardado.id,
        jugador_id: jugador.id,
        rol_partido: jugador.rol_partido || 'Titular',
        estado_notificacion: 'Pendiente'
      }));

      const { error: errorConvocatorias } = await supabaseAdmin
        .from('convocatorias')
        .insert(convocatoriasPayload);

      if (errorConvocatorias) throw errorConvocatorias;
    }

    return NextResponse.json({ success: true, evento: eventoGuardado });
  } catch (error: any) {
    console.error("Error creando convocatoria:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
