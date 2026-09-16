import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('planes_saas')
      .select('id, nombre, tipo_cobro, precio_base, limite_jugadores_base, precio_jugador_extra')
      .eq('activo', true)
      .order('precio_base', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json([], { status: 200 }); // Falla silenciosa — la landing muestra loading
  }
}
