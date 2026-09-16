import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, equipo_rival, escudo_rival_url, es_local, estado_partido } = body;

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const updateData: any = {};
    if (equipo_rival !== undefined) updateData.equipo_rival = equipo_rival;
    if (escudo_rival_url !== undefined) updateData.escudo_rival_url = escudo_rival_url;
    if (es_local !== undefined) updateData.es_local = es_local;
    if (estado_partido !== undefined) updateData.estado_partido = estado_partido;

    const { data, error } = await supabaseAdmin
      .from('eventos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
