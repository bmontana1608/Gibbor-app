import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mesGenerar, anioGenerar, club_id } = body;

    // Buscamos clubes activos
    let query = supabaseAdmin
      .from('clubes')
      .select('*, planes_saas(*)')
      .neq('estado', 'Eliminado');
      
    if (club_id) {
      query = query.eq('id', club_id);
    }

    const { data: activeClubs } = await query;

    if (!activeClubs || activeClubs.length === 0) {
      throw new Error('No hay clubes registrados');
    }

    // Calcular atletas activos por club para el MRR
    const { data: perfilesData } = await supabaseAdmin
      .from('perfiles')
      .select('club_id')
      .eq('estado_miembro', 'Activo')
      .eq('rol', 'Futbolista');

    const activosPorClub: Record<string, number> = {};
    perfilesData?.forEach((p: any) => {
      if (p.club_id) {
        activosPorClub[p.club_id] = (activosPorClub[p.club_id] || 0) + 1;
      }
    });

    let insertadas = 0;
    let duplicadas = 0;

    for (const club of activeClubs) {
      const totalAtletas = activosPorClub[club.id] || 0;
      
      const plan = club.planes_saas;
      const precioBase = plan ? Number(plan.precio_base ?? 100000) : 100000;
      const limiteBase = plan ? Number(plan.limite_jugadores_base ?? 60) : 60;
      const precioExtra = plan ? Number(plan.precio_jugador_extra ?? 2000) : 2000;
      
      const extras = Math.max(0, totalAtletas - limiteBase);
      const total = precioBase + (extras * precioExtra);

      const { error } = await supabaseAdmin
        .from('facturacion_mensual')
        .insert([{
          club_id: club.id,
          periodo_mes: Number(mesGenerar),
          periodo_anio: Number(anioGenerar),
          cantidad_jugadores: totalAtletas,
          tarifa_aplicada: precioBase,
          total_pagar: total,
          estado_pago: 'pendiente'
        }]);

      if (error) {
        if (error.code === '23505') { // Unique constraint
          duplicadas++;
        } else {
          console.error('Error insertando factura para', club.nombre, error);
        }
      } else {
        insertadas++;
      }
    }

    return NextResponse.json({ success: true, insertadas, duplicadas });
  } catch (error: any) {
    console.error('Error in /api/admin/cobranza/facturacion-manual:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
