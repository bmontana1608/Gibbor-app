import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { numero, mensaje, lead_id, media_url, media_type } = await req.json();
    if (!numero) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    if (!mensaje && !media_url) return NextResponse.json({ error: 'Falta mensaje o archivo' }, { status: 400 });

    // ── Determinar instancia ──────────────────────────────────────────────────
    const { data: perfil } = await supabaseAdmin
      .from('perfiles').select('rol, club_id, clubes(slug)').eq('id', user.id).single();
    let instance = 'mcm-ventas';
    if (perfil?.rol === 'Embajador') {
      const { data: emb } = await supabaseAdmin.from('embajadores').select('id').eq('user_id', user.id).single();
      if (emb) instance = `embajador-${emb.id}`;
    } else if (perfil?.club_id) {
      instance = (perfil.clubes as any)?.slug || 'mcm-ventas';
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
    const evolutionKey = process.env.EVOLUTION_API_KEY || '';
    const cleanNum = numero.replace(/\D/g, '');

    let evoResponse: Response;

    if (media_url) {
      // ── Enviar multimedia ───────────────────────────────────────────────────
      if (media_type === 'audio') {
        // Nota de voz nativa (se muestra como audio en WhatsApp)
        evoResponse = await fetch(`${evolutionUrl}/message/sendWhatsAppAudio/${instance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
          body: JSON.stringify({
            number: cleanNum,
            options: { delay: 500 },
            audio: media_url
          })
        });
      } else {
        // Imagen, documento, video
        const mediaTypeMap: Record<string, string> = {
          image: 'image', video: 'video', document: 'document'
        };
        evoResponse = await fetch(`${evolutionUrl}/message/sendMedia/${instance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
          body: JSON.stringify({
            number: cleanNum,
            options: { delay: 800, presence: 'composing' },
            mediaMessage: {
              mediatype: mediaTypeMap[media_type] || 'document',
              media: media_url,
              caption: mensaje || '',
              fileName: mensaje || 'archivo'
            }
          })
        });
      }
    } else {
      // ── Enviar texto ────────────────────────────────────────────────────────
      evoResponse = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
        body: JSON.stringify({
          number: cleanNum,
          options: { delay: 1200, presence: 'composing' },
          text: mensaje
        })
      });
    }

    if (!evoResponse.ok) {
      const errText = await evoResponse.text();
      console.error('Evolution API error:', errText);
      return NextResponse.json({ error: 'Error al enviar mensaje via WhatsApp' }, { status: 500 });
    }

    // ── Guardar en BD ─────────────────────────────────────────────────────────
    await supabaseAdmin.from('crm_whatsapp_messages').insert({
      lead_id: lead_id || null,
      numero_telefono: cleanNum,
      mensaje: mensaje || (media_type ? `[${media_type}]` : ''),
      media_url: media_url || null,
      media_type: media_type || null,
      leido: true,
      es_saliente: true,
      instancia: instance
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
