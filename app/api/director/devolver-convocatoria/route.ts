import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { evento_id, club_slug } = await request.json();

    if (!evento_id || !club_slug) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const { data: club } = await supabaseAdmin
      .from('clubes')
      .select('id')
      .eq('slug', club_slug)
      .single();

    if (!club) return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 });

    // Actualizar estado del evento a Devuelta
    const { error: updErr } = await supabaseAdmin
      .from('eventos')
      .update({ estado: 'Devuelta' })
      .eq('id', evento_id)
      .eq('club_id', club.id);

    if (updErr) throw updErr;

    return NextResponse.json({ success: true, mensaje: 'Convocatoria devuelta al entrenador' });

  } catch (error: any) {
    console.error('Error devolviendo convocatoria:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
