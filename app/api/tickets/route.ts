import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clubId, directorId, asunto, categoria, mensaje } = body;

    if (!clubId || !directorId || !asunto || !categoria || !mensaje) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // 1. Guardar en Base de Datos (Bandeja Interna)
    const { data: ticket, error } = await supabaseAdmin
      .from('tickets_soporte')
      .insert({
        club_id: clubId,
        director_id: directorId,
        asunto,
        categoria,
        mensaje,
        estado: 'Abierto'
      })
      .select()
      .single();

    if (error) {
      console.error('Error insertando ticket:', error);
      return NextResponse.json({ error: 'No se pudo guardar el ticket' }, { status: 500 });
    }

    // 2. Obtener la configuración del SuperAdmin para ver si hay un Slack Webhook
    const { data: config } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('slack_webhook_url')
      .eq('id', 1)
      .maybeSingle();

    const slackWebhookUrl = config?.slack_webhook_url;

    // 3. Enviar a Slack (Si está configurado)
    if (slackWebhookUrl) {
      const { data: club } = await supabaseAdmin.from('clubes').select('nombre').eq('id', clubId).maybeSingle();
      const clubName = club?.nombre || 'Club Desconocido';

      const slackPayload = {
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `🚨 Nuevo Ticket de Soporte: ${categoria}`
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Club:*\n${clubName}`
              },
              {
                type: "mrkdwn",
                text: `*Estado:*\n🔴 Abierto`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Asunto:*\n${asunto}\n\n*Mensaje:*\n_${mensaje}_`
            }
          },
          {
            type: "divider"
          }
        ]
      };

      // Enviamos el webhook pero no bloqueamos la respuesta al cliente si falla
      fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload)
      }).catch(err => console.error('Error enviando webhook a Slack:', err));
    }

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    console.error('Error procesando ticket:', err);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
