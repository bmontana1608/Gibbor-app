import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 1. Contador de Clubes (Solo Activos y Suspendidos)
    const { data: clubesValidos } = await supabaseAdmin.from('clubes').select('id').neq('estado', 'Eliminado');
    const validClubIds = clubesValidos?.map(c => c.id) || [];
    const totalClubes = validClubIds.length;

    // 2. Contador de Jugadores (Solo los que pertenecen a clubes válidos)
    const { count: totalJugadores } = await supabaseAdmin
      .from('perfiles')
      .select('*', { count: 'exact', head: true })
      .eq('rol', 'Futbolista')
      .in('club_id', validClubIds);

    // 3. Volumen Transaccional (Dinero que los clubes han recaudado internamente este mes)
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0,0,0,0);
    const isoInicio = inicioMes.toISOString();

    const { data: pagosClubes } = await supabaseAdmin
      .from('pagos_ingresos')
      .select('total')
      .filter('fecha', 'gte', isoInicio)
      .in('club_id', validClubIds);

    const volumenTransaccional = pagosClubes?.reduce((acc, p) => acc + parseFloat(p.total || 0), 0) || 0;

    // 4. Recaudo SaaS (Lo que la plataforma ha cobrado a los clubes este mes y ya está pagado)
    const { data: facturacionSaaS } = await supabaseAdmin
      .from('facturacion_mensual')
      .select('total')
      .eq('estado_pago', 'pagado')
      .eq('periodo_mes', inicioMes.getMonth() + 1)
      .eq('periodo_anio', inicioMes.getFullYear());
      
    const recaudoSaaS = facturacionSaaS?.reduce((acc, f) => acc + parseFloat(f.total || 0), 0) || 0;

    // 5. Conteo de alumnos detallado por Club
    const { data: perfiles } = await supabaseAdmin
      .from('perfiles')
      .select('club_id')
      .eq('rol', 'Futbolista')
      .in('club_id', validClubIds);

    const alumnosPorClub: Record<string, number> = {};
    perfiles?.forEach(p => {
      if (p.club_id) {
        alumnosPorClub[p.club_id] = (alumnosPorClub[p.club_id] || 0) + 1;
      }
    });

    // 6. Clubes Activos (Realmente operando)
    const { count: clubesActivos } = await supabaseAdmin
      .from('clubes')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'Activo');

    return NextResponse.json({
      totalClubes,
      clubesActivos,
      totalJugadores: totalJugadores || 0,
      volumenTransaccional,
      recaudoSaaS,
      proyeccionIngresosSaaS: (totalJugadores || 0) * 2000,
      alumnosPorClub,
      mesActual: inicioMes.toLocaleString('es-CO', { month: 'long', year: 'numeric' })
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
