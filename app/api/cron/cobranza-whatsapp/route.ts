import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializar supabase admin para saltar RLS en cron job
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // 1. Verificación de Seguridad (Cron Secret)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://masterclubmanager.com');

    // 2. Obtener Clubes con Cobranza Automática Activa
    const { data: configs, error: configError } = await supabaseAdmin
      .from('configuracion_wa')
      .select('club_id, cobranza_dias_previos, cobranza_metodo_pago');

    if (configError) throw configError;

    // Filtrar localmente si boolean falló en type
    const activeConfigs = configs.filter((c: any) => c.cobranza_auto_activa === true || String(c.cobranza_auto_activa) === 'true');

    if (activeConfigs.length === 0) {
      return NextResponse.json({ message: 'No clubs have automated billing enabled.' });
    }

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    let emailsSent = 0;
    let messagesSent = 0;

    for (const config of activeConfigs) {
      // 3. Obtener Slug del club para enviar el WhatsApp
      const { data: club } = await supabaseAdmin.from('clubes').select('slug, nombre').eq('id', config.club_id).single();
      if (!club) continue;

      const diasPrevios = config.cobranza_dias_previos || 3;
      const metodoPago = config.cobranza_metodo_pago || 'puedes hacerlo solicitando el link de pago.';

      // 4. Obtener Jugadores Activos del Club
      const { data: jugadores } = await supabaseAdmin
        .from('perfiles')
        .select('id, nombres, telefono, dia_pago')
        .eq('club_id', config.club_id)
        .eq('rol', 'Futbolista')
        .eq('estado_miembro', 'Activo');

      if (!jugadores || jugadores.length === 0) continue;

      // 5. Obtener pagos de este mes para el club
      const { data: pagosMes } = await supabaseAdmin
        .from('pagos_ingresos')
        .select('jugador_id')
        .eq('club_id', config.club_id)
        .like('fecha', `${currentMonthPrefix}%`);

      const paidPlayerIds = new Set(pagosMes?.map(p => p.jugador_id) || []);

      for (const jugador of jugadores) {
        if (!jugador.telefono) continue;
        if (paidPlayerIds.has(jugador.id)) continue; // Ya pagó este mes

        const diaPago = jugador.dia_pago || 1;
        let mensaje = '';
        
        // Logica Preventiva (Ej: diaPago es 15, hoy es 12, diasPrevios es 3)
        if (currentDay === (diaPago - diasPrevios)) {
          mensaje = `¡Hola ${jugador.nombres.split(' ')[0]}! ⚽ Te recordamos que en ${diasPrevios} días (el día ${diaPago}) vence tu mensualidad en ${club.nombre}. Para facilitar tu pago, ${metodoPago} ¡Gracias por tu compromiso!`;
        } 
        // Lógica Día Cero
        else if (currentDay === diaPago) {
          mensaje = `¡Hola ${jugador.nombres.split(' ')[0]}! ⚽ Hoy es tu fecha de pago en ${club.nombre}. Recuerda que para mantener tu cupo activo ${metodoPago}`;
        }
        // Lógica Mora (Ej: diaPago es 15, hoy es 18)
        else if (currentDay === (diaPago + 3)) {
          mensaje = `⚠️ ¡Hola ${jugador.nombres.split(' ')[0]}! Notamos un retraso en el pago de tu mensualidad en ${club.nombre} (Venció el día ${diaPago}). Para que puedas seguir entrenando sin interrupciones, por favor regulariza tu pago lo antes posible: ${metodoPago}`;
        }

        if (mensaje) {
          try {
            // Send request to our own API
            await fetch(`${baseUrl}/api/whatsapp/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                telefono: jugador.telefono,
                mensaje: mensaje,
                instanceName: club.slug
              })
            });
            messagesSent++;
          } catch (e) {
            console.error(`Error sending automated billing to ${jugador.telefono}:`, e);
          }
        }
      }
    }

    return NextResponse.json({ success: true, processedClubs: activeConfigs.length, messagesSent });
  } catch (error: any) {
    console.error('Error en Cron de cobranza:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
