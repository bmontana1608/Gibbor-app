import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { logAction } from '@/lib/audit';

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
    // 1. Obtener datos antes del cambio
    const { data: club } = await supabaseAdmin.from('clubes').select('nombre').eq('id', id).single();
    const { data: { user } } = await supabaseAdmin.auth.getUser();

    // 2. Realizar SOFT DELETE (Baja Lógica)
    // Cambiamos el estado y marcamos la fecha de eliminación
    const { error } = await supabaseAdmin
      .from('clubes')
      .update({ 
        estado: 'Eliminado',
        deleted_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) throw error;

    // 3. Registrar en Auditoría
    if (user) {
      await logAction({
        userId: user.id,
        clubId: id,
        accion: 'SOFT_DELETE_CLUB',
        descripcion: `Se dio de baja lógica al club: ${club?.nombre || id}. Sus datos permanecen en archivo.`,
        metadata: { club_id: id, nombre: club?.nombre }
      });
    }

    return NextResponse.json({ success: true, message: 'Club dado de baja correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
