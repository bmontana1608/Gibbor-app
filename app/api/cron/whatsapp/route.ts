import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Cron Job para procesar la cola de mensajes de WhatsApp
 * Se recomienda invocar esto cada 1 minuto (ej. Vercel Cron)
 */
export async function GET(request: Request) {
  try {
    // 1. Verificar autorización (opcional, si se usa Vercel Cron u otro header secreto)
    const authHeader = request.headers.get('authorization');
    // Para simplificar, asumiremos que si se llama desde Vercel o localmente está permitido.
    // Podrías agregar: if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return 401;

    const ahora = new Date().toISOString();

    // 2. Obtener hasta 10 mensajes pendientes cuya hora programada ya llegó
    const { data: pendientes, error: fetchError } = await supabaseAdmin
      .from('mensajes_cola')
      .select('*, clubes ( slug )')
      .eq('estado', 'Pendiente')
      .or(`programado_para.is.null,programado_para.lte.${ahora}`)
      .order('fecha_creacion', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('[CRON WA] Error obteniendo pendientes:', fetchError);
      return NextResponse.json({ error: 'Error DB' }, { status: 500 });
    }

    if (!pendientes || pendientes.length === 0) {
      return NextResponse.json({ message: 'No hay mensajes pendientes' });
    }

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return NextResponse.json({ error: 'Faltan env vars de Evolution' }, { status: 500 });
    }

    const cleanUrl = EVOLUTION_API_URL.endsWith('/') ? EVOLUTION_API_URL.slice(0, -1) : EVOLUTION_API_URL;

    console.log(`[CRON WA] Procesando ${pendientes.length} mensajes...`);

    let exitosos = 0;
    let fallidos = 0;

    // 3. Procesar cada mensaje
    for (const msg of pendientes) {
      const slug = msg.clubes?.slug;
      if (!slug) {
        await supabaseAdmin.from('mensajes_cola').update({ 
          estado: 'Error', 
          error_detalle: 'Club no encontrado o sin slug' 
        }).eq('id', msg.id);
        fallidos++;
        continue;
      }

      const instanceName = encodeURIComponent(slug);
      
      // Limpiar y asegurar que el número solo tenga dígitos
      const phoneRaw = (msg.telefono_destino || '').replace(/\D/g, '');
      
      // Armar el payload para Evolution API v2
      const payload = {
        number: phoneRaw,
        options: {
          delay: 1500, // Retraso artificial para simular tipeo y proteger contra SPAM
          presence: 'composing'
        },
        textMessage: {
          text: msg.mensaje
        }
      };

      try {
        const evoRes = await fetch(`${cleanUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY
          },
          body: JSON.stringify(payload)
        });

        if (evoRes.ok) {
          // Marcar como enviado
          await supabaseAdmin.from('mensajes_cola').update({ 
            estado: 'Enviado', 
            fecha_envio: new Date().toISOString() 
          }).eq('id', msg.id);
          exitosos++;
        } else {
          // Si Evolution da error (ej. instancia desconectada)
          const errorText = await evoRes.text();
          console.error(`[CRON WA] Error Evolution al enviar a ${phoneRaw}:`, errorText);
          await supabaseAdmin.from('mensajes_cola').update({ 
            estado: 'Error', 
            error_detalle: `Evolution HTTP ${evoRes.status}: ${errorText}` 
          }).eq('id', msg.id);
          fallidos++;
        }
      } catch (err: any) {
        // Error de red
        console.error(`[CRON WA] Error de Red al enviar a ${phoneRaw}:`, err.message);
        await supabaseAdmin.from('mensajes_cola').update({ 
          estado: 'Error', 
          error_detalle: err.message 
        }).eq('id', msg.id);
        fallidos++;
      }

      // Pausa intencional de 1.5s entre cada mensaje de este batch para mayor seguridad
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return NextResponse.json({ 
      success: true, 
      procesados: pendientes.length, 
      exitosos, 
      fallidos 
    });

  } catch (error: any) {
    console.error('[CRON WA] Fatal Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
