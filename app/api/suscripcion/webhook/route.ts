import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const clubId = url.searchParams.get('clubId');
    const type = url.searchParams.get('type') || (await req.json().catch(() => ({})))?.type;
    const body = await req.json().catch(() => ({}));

    // El evento 'payment' es el importante
    if (type === 'payment' || body?.type === 'payment') {
      const paymentId = url.searchParams.get('data.id') || body?.data?.id;

      if (!paymentId) return NextResponse.json({ ok: true });
      
      const masterMpToken = process.env.MP_ACCESS_TOKEN;
      if (!masterMpToken) return NextResponse.json({ ok: true });

      // Consultar el estado real del pago en MP
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${masterMpToken}` }
      });
      const paymentData = await mpResponse.json();

      if (paymentData.status === 'approved' && clubId) {
        
        // Obtener el corte actual
        const { data: club } = await supabaseAdmin
          .from('clubes')
          .select('proximo_corte')
          .eq('id', clubId)
          .single();

        let nuevaFecha = new Date();
        
        // Si ya tenía fecha futura, le sumamos un mes a esa fecha
        if (club && club.proximo_corte) {
           const corteActual = new Date(club.proximo_corte);
           if (corteActual > nuevaFecha) {
              nuevaFecha = corteActual;
           }
        }
        
        // Sumar un mes
        nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);

        // Actualizar el club
        await supabaseAdmin
          .from('clubes')
          .update({
            estado_suscripcion: 'Activa',
            proximo_corte: nuevaFecha.toISOString()
          })
          .eq('id', clubId);

        console.log(`✅ [SaaS Webhook] Suscripción renovada para el club ${clubId}. Nuevo corte: ${nuevaFecha.toISOString()}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error procesando webhook SaaS MP:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
