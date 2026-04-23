import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { logAction } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tipo, jugadorIds, monto, motivo, otorgadoPor, insigniaId } = body;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (tipo === 'puntos') {
      for (const id of jugadorIds) {
        // 1. Obtener puntos actuales
        const { data: p } = await supabaseAdmin.from('perfiles').select('puntos').eq('id', id).single();
        const nuevosPuntos = (p?.puntos || 0) + monto;

        // 2. Actualizar
        await supabaseAdmin.from('perfiles').update({ puntos: nuevosPuntos }).eq('id', id);

        // 3. Log
        await supabaseAdmin.from('puntos_log').insert([{
          jugador_id: id,
          puntos: monto,
          motivo: motivo,
          otorgado_por: otorgadoPor,
          fecha: new Date().toISOString()
        }]);
      }
      // 4. Auditoría Centralizada
      const { data: { user } } = await supabaseAdmin.auth.getUser();
      if (user) {
        await logAction({
          userId: user.id,
          clubId: '', // Necesitaríamos obtener el club_id del usuario, omitimos por ahora o buscamos
          accion: 'OTORGAR_PUNTOS',
          descripcion: `Se otorgaron ${monto} puntos a ${jugadorIds.length} jugadores. Motivo: ${motivo}`,
          metadata: { monto, cantidad_jugadores: jugadorIds.length, motivo }
        });
      }

      return NextResponse.json({ success: true, message: 'Puntos asignados' });
    }

    if (tipo === 'insignia') {
      // (código omitido para brevedad: upsert de insignias...)
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

      // Auditoría de Insignias
      const { data: { user } } = await supabaseAdmin.auth.getUser();
      if (user) {
        await logAction({
          userId: user.id,
          clubId: '', 
          accion: 'OTORGAR_INSIGNIA',
          descripcion: `Se otorgó la insignia [${insigniaId}] a ${jugadorIds.length} jugadores.`,
          metadata: { insigniaId, cantidad_jugadores: jugadorIds.length }
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
