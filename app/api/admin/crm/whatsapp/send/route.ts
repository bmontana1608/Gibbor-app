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
        number: numero.replace(/\D/g, ''),
        options: {
          delay: 1200,
          presence: 'composing'
        },
        text: mensaje
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Evolution API error:", errText);
      return NextResponse.json({ error: 'Error al enviar mensaje' }, { status: 500 });
    }

    // Guardar el mensaje saliente en la base de datos para que aparezca instantáneamente en el chat
    await supabaseAdmin.from('crm_whatsapp_messages').insert({
      lead_id: lead_id || null,
      numero_telefono: numero.replace(/\D/g, ''),
      mensaje: mensaje,
      es_saliente: true,
      instancia: instance,
      leido: true
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error send crm wa:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
