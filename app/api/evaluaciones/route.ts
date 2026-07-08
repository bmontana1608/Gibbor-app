import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jugadorId = searchParams.get('jugador_id');

  if (!jugadorId) {
    return NextResponse.json({ error: 'Falta el ID del jugador' }, { status: 400 });
  }

  // Usamos el Service Role Key para saltar el RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: stats, error } = await supabaseAdmin
    .from("evaluaciones_tecnicas")
    .select("stats")
    .eq("jugador_id", jugadorId)
    .order("fecha", { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(stats[0] || null);
}
