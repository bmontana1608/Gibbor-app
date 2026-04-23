import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const club_id = searchParams.get('club_id');
  const entrenador_id = searchParams.get('entrenador_id');

  if (!club_id) {
    return NextResponse.json({ error: 'Club ID requerido' }, { status: 400 });
  }

  let query = supabaseAdmin
    .from('categorias')
    .select('*')
    .eq('club_id', club_id);

  if (entrenador_id) {
    query = query.eq('entrenador_id', entrenador_id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
