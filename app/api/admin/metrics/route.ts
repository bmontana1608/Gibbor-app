import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 1. Obtener todos los clubes
    const { data: clubesData } = await supabaseAdmin.from('clubes').select('id, nombre, estado');
    const validClubes = clubesData?.filter(c => c.estado !== 'Eliminado') || [];
    const validClubIds = validClubes.map(c => c.id);
    const totalClubes = validClubIds.length;

    // Distribución de Estados para Churn Rate y salud
    const distribucionEstados = {
      Activo: clubesData?.filter(c => c.estado === 'Activo').length || 0,
      Pendiente: clubesData?.filter(c => c.estado === 'Pendiente').length || 0,
      Suspendido: clubesData?.filter(c => c.estado === 'Suspendido').length || 0,
      Eliminado: clubesData?.filter(c => c.estado === 'Eliminado').length || 0,
    };

    // 2. Contador de Jugadores (Solo los que pertenecen a clubes válidos)
    const { data: perfiles } = await supabaseAdmin
      .from('perfiles')
      .select('club_id')
      .eq('rol', 'Futbolista')
      .in('club_id', validClubIds);

    const totalJugadores = perfiles?.length || 0;

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

    // 4. Historial SaaS (Todos los meses)
    const { data: facturacionAll } = await supabaseAdmin
      .from('facturacion_mensual')
      .select('periodo_mes, periodo_anio, total, estado_pago');

    const ingresosHistoricosMap: Record<string, { proyectado: number, cobrado: number }> = {};
    
    // Inicializar los últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = `${d.toLocaleString('es-CO', { month: 'short' })} ${d.getFullYear()}`;
      ingresosHistoricosMap[label] = { proyectado: 0, cobrado: 0 };
    }

    facturacionAll?.forEach(f => {
       const label = new Date(f.periodo_anio, f.periodo_mes - 1).toLocaleString('es-CO', { month: 'short' }) + ' ' + f.periodo_anio;
       if (ingresosHistoricosMap[label]) {
         const amount = parseFloat(f.total || 0);
         ingresosHistoricosMap[label].proyectado += amount;
         if (f.estado_pago === 'pagado') {
           ingresosHistoricosMap[label].cobrado += amount;
         }
       }
    });

    const ingresosHistoricos = Object.entries(ingresosHistoricosMap).map(([mes, data]) => ({
      mes,
      ...data
    }));

    // Recaudo SaaS actual
    const mesLabelActual = `${new Date().toLocaleString('es-CO', { month: 'short' })} ${new Date().getFullYear()}`;
    const recaudoSaaS = ingresosHistoricosMap[mesLabelActual]?.cobrado || 0;

    // 5. Conteo de alumnos detallado por Club (Top Clubes)
    const alumnosPorClub: Record<string, number> = {};
    perfiles?.forEach(p => {
      if (p.club_id) {
        alumnosPorClub[p.club_id] = (alumnosPorClub[p.club_id] || 0) + 1;
      }
    });

    const topClubes = validClubes.map(c => ({
      nombre: c.nombre,
      alumnos: alumnosPorClub[c.id] || 0
    })).sort((a, b) => b.alumnos - a.alumnos).slice(0, 5);

    return NextResponse.json({
      totalClubes,
      clubesActivos: distribucionEstados.Activo,
      totalJugadores,
      volumenTransaccional,
      recaudoSaaS,
      proyeccionIngresosSaaS: totalJugadores * 2000,
      alumnosPorClub,
      distribucionEstados,
      ingresosHistoricos,
      topClubes,
      mesActual: inicioMes.toLocaleString('es-CO', { month: 'long', year: 'numeric' })
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
