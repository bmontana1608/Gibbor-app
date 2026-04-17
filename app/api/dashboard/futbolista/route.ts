import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Obtenemos el perfil primero (necesario para el filtro de eventos)
    const { data: perfilData } = await supabaseAdmin
      .from('perfiles')
      .select('*, insignias:insignias_otorgadas(insignia_id, insignias(*))')
      .eq('id', id)
      .single();

    // 2. Ejecutamos el resto en paralelo usando los datos del perfil
    const [
      evalRes,
      pagosRes,
      asisRes,
      configRes,
      eventosRes
    ] = await Promise.all([
      // Evaluaciones técnicas (Promedios)
      supabaseAdmin.from('evaluaciones').select('tecnica, tactica, fisico, mental, ritmo, tiro, pase, regate, defensa').eq('jugador_id', id).order('fecha', { ascending: false }).limit(5),
      
      // Pagos
      supabaseAdmin.from("pagos_ingresos").select("*").eq("jugador_id", id).order("fecha", { ascending: false }).limit(6),
      
      // Asistencias
      supabaseAdmin.from("asistencias").select("*").eq("jugador_id", id).order("fecha", { ascending: false }),
      
      // Configuración Club
      supabaseAdmin.from('configuracion_wa').select('nombre_club, temporada_actual').single(),

      // Próximos Eventos (Filtrados)
      supabaseAdmin.from('eventos')
        .select('*')
        .gte('fecha', new Date().toISOString().split('T')[0])
        .or(`categoria_id.is.null,categoria_id.eq."${perfilData?.grupos || ''}"`)
        .order('fecha', { ascending: true })
        .limit(3)
    ]);

    // Procesar Datos de Evaluación (Carta PRO)
    let stats = { Ritmo: 50, Tiro: 50, Pase: 50, Regate: 50, Defensa: 50, Físico: 50 };
    if (evalRes.data && evalRes.data.length > 0) {
      const evals = evalRes.data;
      const count = evals.length;
      stats = {
        Ritmo: Math.round(evals.reduce((acc, e) => acc + (Number(e.ritmo) || 50), 0) / count),
        Tiro: Math.round(evals.reduce((acc, e) => acc + (Number(e.tiro) || 50), 0) / count),
        Pase: Math.round(evals.reduce((acc, e) => acc + (Number(e.pase) || 50), 0) / count),
        Regate: Math.round(evals.reduce((acc, e) => acc + (Number(e.regate) || 50), 0) / count),
        Defensa: Math.round(evals.reduce((acc, e) => acc + (Number(e.defensa) || 50), 0) / count),
        Físico: Math.round(evals.reduce((acc, e) => acc + ((Number(e.fisico) || 50) + (Number(e.mental) || 50)) / 2, 0) / count),
      };
    }

    // Procesar Asistencia
    let asistenciaPct = 0;
    if (asisRes.data && asisRes.data.length > 0) {
      const presentes = asisRes.data.filter(a => a.estado === 'Presente').length;
      asistenciaPct = Math.round((presentes / asisRes.data.length) * 100);
    }

    return NextResponse.json({
      perfil: perfilData,
      stats,
      pagos: pagosRes.data || [],
      asistenciaPct,
      asistencias: asisRes.data || [],
      config: configRes.data,
      eventos: eventosRes?.data || []
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
