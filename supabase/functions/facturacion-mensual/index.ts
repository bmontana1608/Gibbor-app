import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Configurar cliente Supabase (usando Service Role para saltar RLS y acceder a todo)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determinar el mes y año actual
    const fecha = new Date();
    const periodo_mes = fecha.getMonth() + 1; // 1 - 12
    const periodo_anio = fecha.getFullYear();

    // 1. Obtener todos los clubes y sus planes
    const { data: clubes, error: clubesError } = await supabase
      .from('clubes')
      .select('id, nombre, slug, plan_id, planes_saas(precio_base, limite_jugadores_base, precio_jugador_extra)');

    if (clubesError) throw clubesError;

    const facturasGeneradas = [];

    // 2. Iterar sobre cada club para generar la facturación
    for (const club of clubes) {
      if (!club.plan_id || !club.planes_saas) continue;

      const plan = club.planes_saas;
      const precioBase = Number(plan.precio_base ?? 100000);
      const limiteBase = Number(plan.limite_jugadores_base ?? 60);
      const precioExtra = Number(plan.precio_jugador_extra ?? 2000);

      // 3. Contar la cantidad de jugadores ACTIVOS de este club (solo rol 'Futbolista')
      const { count, error: countError } = await supabase
        .from('perfiles')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', club.id)
        .eq('rol', 'Futbolista')
        .eq('estado_miembro', 'Activo');

      if (countError) {
        console.error(`Error contando jugadores para el club ${club.nombre}:`, countError);
        continue;
      }

      const cantidadJugadores = count || 0;
      const extras = Math.max(0, cantidadJugadores - limiteBase);
      const totalPagar = precioBase + (extras * precioExtra);

      // 4. Upsert de la factura mensual
      const factura = {
        club_id: club.id,
        periodo_mes,
        periodo_anio,
        cantidad_jugadores: cantidadJugadores,
        tarifa_aplicada: precioBase,
        total_pagar: totalPagar,
        estado_pago: 'pendiente'
      };

      const { data: facturaData, error: upsertError } = await supabase
        .from('facturacion_mensual')
        .upsert(factura, { onConflict: 'club_id, periodo_mes, periodo_anio' })
        .select()
        .single();

      if (upsertError) {
        console.error(`Error generando factura para ${club.nombre}:`, upsertError);
        continue;
      }
      
      facturasGeneradas.push(facturaData);

      // 5. NOTIFICACIÓN WHATSAPP AL DIRECTOR
      try {
        // Buscar el teléfono del Director del club
        const { data: director } = await supabase
          .from('perfiles')
          .select('telefono, nombre')
          .eq('club_id', club.id)
          .eq('rol', 'Director')
          .maybeSingle();

        if (director?.telefono && club.slug) {
          const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
          const nombreMes = meses[periodo_mes - 1];
          
          const mensaje = `📌 *NOTIFICACIÓN DE COBRO - ${club.nombre}*\n\n` +
                          `Hola ${director.nombre},\n` +
                          `Se ha generado la facturación de tu club correspondiente a *${nombreMes} ${periodo_anio}*.\n\n` +
                          `• *Atletas Activos:* ${cantidadJugadores}\n` +
                          `• *Monto Total:* $${totalPagar.toLocaleString('es-CO')}\n\n` +
                          `Puedes gestionar el pago desde tu panel administrativo:\n` +
                          `https://gibbor-app.vercel.app/admin/pagos\n\n` +
                          `_Este es un mensaje automático de Gibbor App._`;

          // Llamada a Evolution API (o proxy interno si estuviera disponible en Edge)
          // Usamos la instancia específica del club (slug)
          const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
          const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

          if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
            const cleanUrl = EVOLUTION_API_URL.endsWith('/') ? EVOLUTION_API_URL.slice(0, -1) : EVOLUTION_API_URL;
            const res = await fetch(`${cleanUrl}/message/sendText/${club.slug}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY
              },
              body: JSON.stringify({
                number: director.telefono.includes('57') ? director.telefono : `57${director.telefono}`,
                text: mensaje
              })
            });

            const logEstado = res.ok ? 'exito' : 'fallido';
            const logDetalle = res.ok ? null : await res.text();

            // Registrar Log
            await supabase.from('logs_notificaciones').insert([{
              club_id: club.id,
              destinatario: director.telefono,
              mensaje: mensaje,
              tipo_evento: 'facturacion',
              estado: logEstado,
              error_detalle: logDetalle
            }]);
          }
        }
      } catch (waError) {
        console.error(`Error enviando WhatsApp para ${club.nombre}:`, waError.message);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Proceso completado. ${facturasGeneradas.length} facturas generadas o actualizadas.`,
      periodo: `${periodo_mes}-${periodo_anio}`,
      facturas: facturasGeneradas 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
