import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { club_id, meses = 1, es_prueba = false } = await request.json();

    if (!club_id) {
      return NextResponse.json({ error: 'Falta el ID del club' }, { status: 400 });
    }

    // 1. Obtener el club actual
    const { data: club, error: fetchError } = await supabaseAdmin
      .from('clubes')
      .select('proximo_corte')
      .eq('id', club_id)
      .single();

    if (fetchError || !club) {
      return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 });
    }

    // 2. Calcular la nueva fecha de corte
    const hoy = new Date();
    let fechaBase = new Date();

    if (club.proximo_corte) {
      const corteActual = new Date(club.proximo_corte);
      // Si el corte actual está en el futuro, le sumamos a ese corte.
      // Si ya se venció (está en el pasado), le sumamos a la fecha de hoy.
      if (corteActual > hoy) {
        fechaBase = corteActual;
      }
    }

    // Sumar los meses
    fechaBase.setMonth(fechaBase.getMonth() + meses);
    const nuevoCorte = fechaBase.toISOString().split('T')[0]; // YYYY-MM-DD

    // 3. Actualizar la base de datos (con llave maestra)
    const { error: updateError } = await supabaseAdmin
      .from('clubes')
      .update({
        proximo_corte: nuevoCorte,
        estado: 'Activo',
        estado_suscripcion: es_prueba ? 'En Prueba' : 'Al Día'
      })
      .eq('id', club_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ 
      success: true, 
      mensaje: `Pago registrado. Nuevo corte: ${nuevoCorte}`,
      nuevoCorte 
    });

  } catch (error: any) {
    console.error("Error procesando pago de suscripción:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
