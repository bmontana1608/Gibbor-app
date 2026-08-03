import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // 1. Obtener Estadísticas de Clubes
    const { data: clubes, error: clubesError } = await supabaseAdmin
      .from('clubes')
      .select('estado');
    
    if (clubesError) throw clubesError;

    let totalClubes = 0;
    let clubesActivos = 0;
    let clubesPrueba = 0;
    let clubesEliminados = 0;

    clubes?.forEach(c => {
      totalClubes++;
      if (c.estado === 'Activo') clubesActivos++;
      else if (c.estado === 'Prueba') clubesPrueba++;
      else if (c.estado === 'Eliminado') clubesEliminados++;
    });

    // 2. Obtener Total de Atletas en la Plataforma
    const { count: totalAtletas, error: atletasError } = await supabaseAdmin
      .from('perfiles')
      .select('*', { count: 'exact', head: true })
      .eq('rol', 'Jugador');

    if (atletasError) throw atletasError;

    // 3. Obtener Ingresos del Mes (MRR)
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

    const { data: pagosMes, error: pagosError } = await supabaseAdmin
      .from('pagos_saas')
      .select('monto_pagado')
      .gte('fecha_pago', startOfMonth)
      .lte('fecha_pago', endOfMonth);

    if (pagosError) throw pagosError;

    const mrrActual = pagosMes?.reduce((sum, pago) => sum + Number(pago.monto_pagado || 0), 0) || 0;

    // 4. Obtener Deuda Pendiente Total
    const { data: facturasPendientes, error: facturasError } = await supabaseAdmin
      .from('facturacion_mensual')
      .select('total_pagar')
      .eq('estado_pago', 'pendiente');

    if (facturasError) throw facturasError;

    const deudaTotal = facturasPendientes?.reduce((sum, fac) => sum + Number(fac.total_pagar || 0), 0) || 0;

    // 5. Últimos 5 Pagos Registrados
    const { data: actividadReciente, error: actividadError } = await supabaseAdmin
      .from('pagos_saas')
      .select('id, monto_pagado, fecha_pago, metodo_pago, clubes(nombre, slug)')
      .order('fecha_pago', { ascending: false })
      .limit(5);

    if (actividadError) throw actividadError;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalClubes,
          clubesActivos,
          clubesPrueba,
          clubesEliminados,
          totalAtletas: totalAtletas || 0,
          mrrActual,
          deudaTotal
        },
        actividadReciente: actividadReciente || []
      }
    });

  } catch (error: any) {
    console.error('Error fetching admin dashboard data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
