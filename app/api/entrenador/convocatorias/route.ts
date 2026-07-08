import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan variables de entorno de Supabase');
  return createClient(url, key);
}

export async function GET(request: Request) {
  try {
    const clubId = request.headers.get('x-club-id');
    if (!clubId) {
      return NextResponse.json({ error: 'Falta club_id en el header' }, { status: 400 });
    }

    const supabaseAdmin = getAdmin();

    const { data, error } = await supabaseAdmin
      .from('perfiles')
      .select('id, nombres, apellidos, fecha_nacimiento, foto_url, posiciones, grupos')
      .eq('club_id', clubId)
      .eq('rol', 'Futbolista')
      .order('nombres', { ascending: true });

    if (error) {
      console.error('[GET /api/entrenador/convocatorias] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error('[GET /api/entrenador/convocatorias] Exception:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getAdmin();
    const { evento, jugadores } = await request.json();

    if (!evento || !evento.club_id || !evento.creado_por || !evento.titulo) {
      return NextResponse.json({ error: 'Faltan datos del evento' }, { status: 400 });
    }

    // 1. Insertar Evento (Estado por defecto 'Pendiente')
    // El campo fecha viene como "2026-06-15T10:30" (datetime-local), separar en fecha y hora
    const fechaRaw = evento.fecha || '';
    const [fechaSolo, horaSolo] = fechaRaw.includes('T')
      ? fechaRaw.split('T')
      : [fechaRaw, '00:00'];

    const { data: eventoGuardado, error: errorEvento } = await supabaseAdmin
      .from('eventos')
      .insert([{
        club_id: evento.club_id,
        creado_por: evento.creado_por,
        titulo: evento.titulo,
        descripcion: evento.descripcion || '',
        tipo: evento.tipo_evento,
        fecha: fechaSolo,
        hora: horaSolo || '00:00',
        lugar: evento.lugar || '',
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
    console.error('[POST /api/entrenador/convocatorias]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabaseAdmin = getAdmin();
    const { evento, jugadores } = await request.json();

    if (!evento || !evento.id) {
      return NextResponse.json({ error: 'Falta el ID del evento a modificar' }, { status: 400 });
    }

    const fechaRaw = evento.fecha || '';
    const [fechaSolo, horaSolo] = fechaRaw.includes('T')
      ? fechaRaw.split('T')
      : [fechaRaw, '00:00'];

    // 1. Actualizar el evento existente y regresarlo a 'Pendiente'
    const { data: eventoActualizado, error: errorEvento } = await supabaseAdmin
      .from('eventos')
      .update({
        titulo: evento.titulo,
        descripcion: evento.descripcion || '',
        tipo: evento.tipo_evento,
        fecha: fechaSolo,
        hora: horaSolo || '00:00',
        lugar: evento.lugar || '',
        estado: 'Pendiente'
      })
      .eq('id', evento.id)
      .select()
      .single();

    if (errorEvento) throw errorEvento;

    // 2. Eliminar las convocatorias actuales
    const { error: deleteError } = await supabaseAdmin
      .from('convocatorias')
      .delete()
      .eq('evento_id', evento.id);

    if (deleteError) throw deleteError;

    // 3. Insertar los nuevos convocados
    if (jugadores && jugadores.length > 0) {
      const convocatoriasPayload = jugadores.map((jugador: any) => ({
        evento_id: evento.id,
        jugador_id: jugador.id,
        rol_partido: jugador.rol_partido || 'Titular',
        estado_notificacion: 'Pendiente'
      }));

      const { error: errorConvocatorias } = await supabaseAdmin
        .from('convocatorias')
        .insert(convocatoriasPayload);

      if (errorConvocatorias) throw errorConvocatorias;
    }

    return NextResponse.json({ success: true, evento: eventoActualizado });
  } catch (error: any) {
    console.error('[PUT /api/entrenador/convocatorias]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
