import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/tenant';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // Obtener tenant actual
  const tenant = await getTenant();

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
      .eq('club_id', tenant.id)
      .single();

    // 2. Ejecutamos el resto en paralelo usando los datos del perfil
    const [
      evalRes,
      pagosRes,
      asisRes,
      configRes,
      eventosRes
    ] = await Promise.all([
      // Evaluaciones técnicas reales (Desde el nuevo Stats Lab)
      supabaseAdmin.from('evaluaciones_tecnicas').select('stats').eq('jugador_id', id).eq('club_id', tenant.id).order('fecha', { ascending: false }).limit(5),
      
      // Pagos
      supabaseAdmin.from("pagos_ingresos").select("*").eq("jugador_id", id).eq('club_id', tenant.id).order("fecha", { ascending: false }).limit(6),
      
      // Asistencias
      supabaseAdmin.from("asistencias").select("*").eq("jugador_id", id).eq('club_id', tenant.id).order("fecha", { ascending: false }),
      
      // Configuración Club
      supabaseAdmin.from('configuracion_wa').select('nombre_club, temporada_actual').eq('club_id', tenant.id).single(),

      // Próximos Eventos (Filtrados)
      supabaseAdmin.from('eventos')
        .select('*')
        .gte('fecha', new Date().toISOString().split('T')[0])
        .eq('club_id', tenant.id)
        .or(`categoria_id.is.null,categoria_id.eq."",categoria_id.eq."${perfilData?.grupos || 'NINGUNA'}"`)
        .order('fecha', { ascending: true })
        .limit(3)
    ]);

    // Procesar Datos de Evaluación (Mapeo Inteligente para Carta PRO)
    let stats = { Ritmo: 50, Tiro: 50, Pase: 50, Regate: 50, Defensa: 50, Físico: 50 };
    
    if (evalRes.data && evalRes.data.length > 0) {
      const evals = evalRes.data;
      const count = evals.length;
      
      // Extraer todas las llaves de stats encontradas en las últimas evaluaciones
      const sumas: any = { Ritmo: 0, Tiro: 0, Pase: 0, Regate: 0, Defensa: 0, Físico: 0 };
      const contadores: any = { Ritmo: 0, Tiro: 0, Pase: 0, Regate: 0, Defensa: 0, Físico: 0 };

      // Diccionario de mapeo (Habilidad del Entrenador -> Categoría FIFA)
      const mapeo: any = {
        'Velocidad': 'Ritmo', 'Aceleración': 'Ritmo', 'Sprint': 'Ritmo', 'Ritmo': 'Ritmo',
        'Remate': 'Tiro', 'Potencia': 'Tiro', 'Definición': 'Tiro', 'Tiro': 'Tiro',
        'Visión': 'Pase', 'Centros': 'Pase', 'Paso Corto': 'Pase', 'Pase': 'Pase',
        'Agilidad': 'Regate', 'Control': 'Regate', 'Drible': 'Regate', 'Regate': 'Regate',
        'Marcaje': 'Defensa', 'Entradas': 'Defensa', 'Cabezazo': 'Defensa', 'Defensa': 'Defensa',
        'Resistencia': 'Físico', 'Fuerza': 'Físico', 'Agresividad': 'Físico', 'Físico': 'Físico', 'Salto': 'Físico'
      };

      evals.forEach(ev => {
        const s = ev.stats as Record<string, number>;
        if (s) {
          Object.entries(s).forEach(([hab, val]) => {
            const cat = mapeo[hab] || hab; // Si no hay mapeo, intentamos usar el nombre directo
            if (sumas.hasOwnProperty(cat)) {
              sumas[cat] += val;
              contadores[cat]++;
            }
          });
        }
      });

      // Calcular promedios finales
      Object.keys(stats).forEach((k: string) => {
        const valFinal = contadores[k] > 0 ? Math.round(sumas[k] / contadores[k]) : 50;
        (stats as any)[k] = valFinal;
      });
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
