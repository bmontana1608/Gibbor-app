import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Falta el ID' }, { status: 400 });
  }

  // Usamos el Service Role Key para saltar el RLS (solo en el servidor)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: perfil, error } = await supabaseAdmin
    .from("perfiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Traer insignias con join a la tabla maestra
  const { data: insignias } = await supabaseAdmin
    .from("insignias_otorgadas")
    .select("insignia_id, fecha, insignias(*)")
    .eq("jugador_id", id);

  return NextResponse.json({
    ...perfil,
    insignias: insignias || []
  });
}
