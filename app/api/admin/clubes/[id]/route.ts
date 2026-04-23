import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Datos básicos del club
    const { data: club } = await supabaseAdmin
      .from('clubes')
      .select('*')
      .eq('id', id)
      .single();

    if (!club) return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 });

    // 2. Conteo de Entrenadores
    const { count: coaches } = await supabaseAdmin
      .from('perfiles')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', id)
      .eq('rol', 'Entrenador');

    // 3. Conteo de Categorías
    const { count: categorias } = await supabaseAdmin
      .from('categorias')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', id);

    // 4. Últimos 5 pagos registrados (con JOIN a perfiles para obtener nombres)
    const { data: ultimosPagos } = await supabaseAdmin
      .from('pagos_ingresos')
      .select(`
        *,
        perfiles:jugador_id (
          nombres,
          apellidos
        )
      `)
      .eq('club_id', id)
      .order('fecha', { ascending: false })
      .limit(10);

    // Mapear para que el frontend reciba 'jugador_nombre'
    const actividadMapeada = ultimosPagos?.map(pago => ({
      ...pago,
      jugador_nombre: pago.perfiles ? `${pago.perfiles.nombres} ${pago.perfiles.apellidos}` : 'Alumno Sin Perfil'
    }));

    return NextResponse.json({
      club,
      stats: {
        coaches: coaches || 0,
        categorias: categorias || 0
      },
      actividad: actividadMapeada || []
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { error } = await supabaseAdmin
      .from('clubes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
