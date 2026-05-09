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
    const { record } = await req.json(); // Payload de Supabase Webhook (INSERT)

    if (!record || record.rol !== 'Futbolista') {
      return new Response(JSON.stringify({ message: "No es un registro de futbolista" }), { status: 200 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Obtener datos del club
    const { data: club } = await supabase
      .from('clubes')
      .select('nombre, slug')
      .eq('id', record.club_id)
      .single();

    if (!club || !club.slug) {
      return new Response(JSON.stringify({ error: "Club no encontrado o sin slug" }), { status: 400 });
    }

    // 2. Preparar mensaje
    const destinatario = record.telefono;
    if (!destinatario) {
      return new Response(JSON.stringify({ message: "Jugador sin teléfono registrado" }), { status: 200 });
    }

    const mensaje = `⚽ *¡BIENVENIDO A ${club.nombre.toUpperCase()}!*\n\n` +
                    `Hola ${record.acudiente_nombre || 'Padre/Madre'},\n` +
                    `Estamos felices de recibir a *${record.nombres}* en nuestra familia deportiva. ✨\n\n` +
                    `Desde ahora podrás seguir su progreso, asistencias y pagos desde nuestro portal oficial.\n\n` +
                    `¡Nos vemos en la cancha! 🏟️`;

    // 3. Enviar vía Evolution API
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
          number: destinatario.includes('57') ? destinatario : `57${destinatario}`,
          text: mensaje
        })
      });

      const logEstado = res.ok ? 'exito' : 'fallido';
      const logDetalle = res.ok ? null : await res.text();

      // 4. Registrar Log
      await supabase.from('logs_notificaciones').insert([{
        club_id: record.club_id,
        destinatario: destinatario,
        mensaje: mensaje,
        tipo_evento: 'bienvenida',
        estado: logEstado,
        error_detalle: logDetalle
      }]);

      return new Response(JSON.stringify({ success: res.ok, status: logEstado }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      });
    }

    return new Response(JSON.stringify({ error: "Variables de entorno no configuradas" }), { status: 500 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
