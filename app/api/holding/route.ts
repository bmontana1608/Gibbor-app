import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/holding?slug=[holding_slug]
// Retorna el holding con sus sedes y métricas consolidadas
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const holdingSlug = searchParams.get('slug');

    if (!holdingSlug) {
      return NextResponse.json({ error: 'Slug del holding requerido' }, { status: 400 });
    }

    // Validar sesión del usuario
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener el holding y verificar que el usuario sea el owner
    const { data: holding, error: holdingError } = await supabaseAdmin
      .from('holdings')
      .select('*')
      .eq('slug', holdingSlug)
      .single();

    if (holdingError || !holding) {
      return NextResponse.json({ error: 'Holding no encontrado' }, { status: 404 });
    }

    // Verificar que el usuario sea el owner o un SuperAdmin
    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const isSuperAdmin = perfil?.rol === 'SuperAdmin';
    const isOwner = holding.owner_id === user.id;

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener todas las sedes del holding
    const { data: sedes, error: sedesError } = await supabaseAdmin
      .from('clubes')
      .select('id, nombre, slug, color_primario, logo_url, ciudad, pais, estado_suscripcion')
      .eq('holding_id', holding.id);

    if (sedesError) throw sedesError;

    const sedeIds = (sedes || []).map(s => s.id);

    // Si no hay sedes, devolver holding vacío
    if (sedeIds.length === 0) {
      return NextResponse.json({
        holding,
        sedes: [],
        metricas: {
          totalAlumnos: 0,
          alumnosActivos: 0,
          ingresosMes: 0,
          totalSedes: 0
        }
      });
    }

    // Métricas consolidadas de todas las sedes
    const [alumnosRes, ingresosRes, sedesStatsRes] = await Promise.all([
      // Total alumnos por estado
      supabaseAdmin
        .from('perfiles')
        .select('estado_miembro, club_id', { count: 'exact' })
        .in('club_id', sedeIds)
        .eq('rol', 'Futbolista'),

      // Ingresos del mes actual (desde pagos)
      supabaseAdmin
        .from('pagos')
        .select('monto, club_id')
        .in('club_id', sedeIds)
        .gte('fecha_pago', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

      // Stats por sede (alumnos + ingresos)
      supabaseAdmin
        .from('perfiles')
        .select('club_id, estado_miembro')
        .in('club_id', sedeIds)
        .eq('rol', 'Futbolista')
    ]);

    // Calcular métricas por sede
    const statsPorSede: Record<string, { totalAlumnos: number; alumnosActivos: number; ingresosMes: number }> = {};
    sedeIds.forEach(id => {
      statsPorSede[id] = { totalAlumnos: 0, alumnosActivos: 0, ingresosMes: 0 };
    });

    (sedesStatsRes.data || []).forEach((p: any) => {
      if (statsPorSede[p.club_id]) {
        statsPorSede[p.club_id].totalAlumnos++;
        if (p.estado_miembro === 'Activo') {
          statsPorSede[p.club_id].alumnosActivos++;
        }
      }
    });

    (ingresosRes.data || []).forEach((p: any) => {
      if (statsPorSede[p.club_id]) {
        statsPorSede[p.club_id].ingresosMes += parseFloat(p.monto || 0);
      }
    });

    // Enriquecer sedes con sus stats
    const sedesConStats = (sedes || []).map(sede => ({
      ...sede,
      stats: statsPorSede[sede.id] || { totalAlumnos: 0, alumnosActivos: 0, ingresosMes: 0 }
    }));

    // Métricas totales consolidadas
    const metricas = {
      totalAlumnos: alumnosRes.count || 0,
      alumnosActivos: (alumnosRes.data || []).filter((p: any) => p.estado_miembro === 'Activo').length,
      ingresosMes: (ingresosRes.data || []).reduce((sum: number, p: any) => sum + parseFloat(p.monto || 0), 0),
      totalSedes: sedeIds.length
    };

    return NextResponse.json({ holding, sedes: sedesConStats, metricas });
  } catch (error: any) {
    console.error('Holding API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
