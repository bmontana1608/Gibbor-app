import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logAction } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tipo, jugadorIds, monto, motivo, otorgadoPor, insigniaId } = body;

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: perfil } = await supabase.from('perfiles').select('rol, club_id').eq('id', user.id).single();
    if (!perfil || !['SuperAdmin', 'Director', 'Entrenador'].includes(perfil.rol || '')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (perfil.rol !== 'SuperAdmin') {
      const { data: targetPlayers } = await supabaseAdmin
        .from('perfiles')
        .select('club_id')
        .in('id', jugadorIds);
      
      const distinctClubIds = Array.from(new Set(targetPlayers?.map(p => p.club_id).filter(Boolean)));
      if (distinctClubIds.length > 1 || (distinctClubIds.length === 1 && distinctClubIds[0] !== perfil.club_id)) {
        return NextResponse.json({ error: 'No autorizado (diferente club)' }, { status: 403 });
      }
    }

    const insigniasDisponibles = [
      { id: 'goleador', nombre: 'Goleador Élite', icono: '⚽', desc: 'Máximo artillero' },
      { id: 'muro', nombre: 'Muro Defensivo', icono: '🛡️', desc: 'Defensa impenetrable' },
      { id: 'cerebro', nombre: 'Cerebro del Campo', icono: '🧠', desc: 'Visión de juego superior' },
      { id: 'fairplay', nombre: 'Espíritu Deportivo', icono: '🤝', desc: 'Compañerismo y valores' },
      { id: 'rayo', nombre: 'Rayo Veloz', icono: '⚡', desc: 'Velocidad explosiva' }
    ];

    if (tipo === 'puntos') {
      for (const id of jugadorIds) {
        // 1. Obtener puntos actuales
        const { data: p } = await supabaseAdmin.from('perfiles').select('puntos').eq('id', id).single();
        const nuevosPuntos = (p?.puntos || 0) + monto;

        // 2. Actualizar
        await supabaseAdmin.from('perfiles').update({ puntos: nuevosPuntos }).eq('id', id);

        // 3. Log interno de puntos
        await supabaseAdmin.from('puntos_log').insert([{
          jugador_id: id,
          puntos: monto,
          motivo: motivo,
          otorgado_por: otorgadoPor,
          fecha: new Date().toISOString()
        }]);
      }

      // 4. Auditoría Centralizada MCM
      if (user) {
        await logAction({
          userId: user.id,
          clubId: '', // Opcional para este contexto
          accion: 'OTORGAR_PUNTOS',
          descripcion: `Se otorgaron ${monto} puntos a ${jugadorIds.length} jugadores. Motivo: ${motivo}`,
          metadata: { monto, cantidad_jugadores: jugadorIds.length, motivo, otorgadoPor }
        });
      }

      return NextResponse.json({ success: true, message: 'Puntos asignados' });
    }

    if (tipo === 'insignia') {
      // Registrar insignias en la base si no existen
      for (const ins of insigniasDisponibles) {
         await supabaseAdmin.from('insignias').upsert([{ 
           id: ins.id, 
           nombre: ins.nombre, 
           icono: ins.icono, 
           descripcion: ins.desc,
           nivel: 'Bronce'
         }], { onConflict: 'id' });
      }

      for (const id of jugadorIds) {
        await supabaseAdmin.from('insignias_otorgadas').insert([{
          jugador_id: id,
          insignia_id: insigniaId,
          fecha: new Date().toISOString()
        }]);
      }

      // Auditoría de Insignias MCM
      if (user) {
        await logAction({
          userId: user.id,
          clubId: '', 
          accion: 'OTORGAR_INSIGNIA',
          descripcion: `Se otorgó la condecoración [${insigniaId}] a ${jugadorIds.length} jugadores.`,
          metadata: { insigniaId, cantidad_jugadores: jugadorIds.length, otorgadoPor }
        });
      }

      return NextResponse.json({ success: true, message: 'Insignias otorgadas' });
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });

  } catch (error: any) {
    console.error("❌ Error en Recompensas API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
