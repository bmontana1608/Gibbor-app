import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Obtener clubes con facturas pendientes del periodo actual
    // Buscamos facturas creadas hace más de 4 días (para que el día 5 se active)
    // que sigan en estado 'pendiente'.
    
    console.log("Iniciando proceso de suspensión automática...");

    const { data: morosos, error: queryError } = await supabase
      .from('facturacion_mensual')
      .select('club_id, clubes(nombre, slug)')
      .eq('estado_pago', 'pendiente')
      .lt('created_at', new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString());

    if (queryError) throw queryError;

    const suspendidos = [];

    for (const factura of morosos) {
      if (!factura.club_id) continue;

      // 2. Cambiar estado del club a suspendido
      const { error: updateError } = await supabase
        .from('clubes')
        .update({ estado_suscripcion: 'suspendido' })
        .eq('id', factura.club_id);

      if (updateError) {
        console.error(`Error suspendiendo club ${factura.club_id}:`, updateError);
      } else {
        suspendidos.push(factura.clubes?.nombre || factura.club_id);
        
        // 3. Opcional: Enviar notificación de suspensión vía WhatsApp
        // Podríamos re-usar la lógica de envío de mensajes aquí
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Proceso completado. ${suspendidos.length} clubes suspendidos.`,
      clubes: suspendidos
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
