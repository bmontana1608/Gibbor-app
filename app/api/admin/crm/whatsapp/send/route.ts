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

    // Identificar la instancia
    const { data: perfil } = await supabaseAdmin.from('perfiles').select('rol, club_id, clubes(slug)').eq('id', user.id).single();
    let instance = 'mcm-ventas';
    
    if (perfil?.rol === 'Embajador') {
      const { data: embajador } = await supabaseAdmin.from('embajadores').select('id').eq('user_id', user.id).single();
      if (embajador) {
        instance = \embajador-\\;
      }
    } else if (perfil?.club_id) {
      instance = (perfil.clubes as any)?.slug || 'mcm-ventas';
    }

    // Call Evolution API
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;

    const response = await fetch(\\/message/sendText/\\, {
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

    // Guardar el mensaje saliente en la base de datos para que aparezca instantneamente en el chat
    await supabaseAdmin.from('crm_whatsapp_messages').insert({
      lead_id: lead_id || null,
      numero_telefono: numero.replace(/\D/g, ''),
      mensaje: mensaje,
      leido: true,
      es_saliente: true
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
