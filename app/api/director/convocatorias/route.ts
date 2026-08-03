import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/tenant';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const tenant = await getTenant(slug) as any;
  if (!tenant) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });

  try {
    const { data, error } = await supabaseAdmin
      .from('eventos')
      .select(`
        *,
        perfiles!eventos_creado_por_fkey (nombres, apellidos),
        convocatorias (
          id,
          jugador_id,
          rol_partido,
          estado_notificacion,
          perfiles!convocatorias_jugador_id_fkey (id, nombres, apellidos, foto_url, posicion)
        )
      `)
      .eq('club_id', tenant.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filtrar solo eventos que tengan convocatorias
    const eventosConConvocatorias = data.filter((e: any) => e.convocatorias && e.convocatorias.length > 0);
    
    return NextResponse.json(eventosConConvocatorias);
  } catch (error: any) {
    console.error("Error fetching convocatorias admin:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
