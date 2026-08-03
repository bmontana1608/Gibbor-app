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
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const entrenadorId = searchParams.get('entrenadorId');

    if (!clubId || !entrenadorId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const supabaseAdmin = getAdmin();

    const { data, error } = await supabaseAdmin
      .from('eventos')
      .select('*, convocatorias(jugador_id, rol_partido)')
      .eq('club_id', clubId)
      .eq('creado_por', entrenadorId)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('[GET /api/entrenador/mis-eventos]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error('[GET /api/entrenador/mis-eventos] Exception:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
