import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { numero, mensaje, lead_id } = await req.json();

    if (!numero || !mensaje) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // Call Evolution API
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const instance = 'mcm-ventas';

    const response = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey || ''
      },
      body: JSON.stringify({
        number: numero,
        options: {
          delay: 1200,
          presence: 'composing'
        },
        textMessage: {
          text: mensaje
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Evolution API error:", errText);
      return NextResponse.json({ error: 'Error al enviar mensaje' }, { status: 500 });
    }

    // Optionally save locally if the webhook doesn't catch our own outgoing messages reliably
    // Webhook should catch it (fromMe=true), but it's safer to let webhook do it or do it here.
    // The webhook handles it if it's connected, but we can insert it here and let webhook ignore duplicates, 
    // or just rely on the webhook. We will rely on the webhook since it processes `fromMe: true`.

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error send crm wa:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
