import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * GET /api/jugadores-club?club_id=xxx
 * Retorna todos los futbolistas de un club usando el service role key.
 * Bypasea RLS para que el entrenador pueda ver los jugadores.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('club_id');

    if (!clubId) {
      return NextResponse.json({ error: 'Falta club_id' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from('perfiles')
      .select('id, nombres, apellidos, fecha_nacimiento, foto_url, posiciones, grupos')
      .eq('club_id', clubId)
      .eq('rol', 'Futbolista')
      .order('nombres', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
