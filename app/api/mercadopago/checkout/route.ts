import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { clubId, jugadorId, monto, nombreJugador, email, dominioOrigen } = await req.json();

    if (!clubId || !jugadorId || !monto) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // 1. Obtener las credenciales de Mercado Pago del club
    const { data: club, error: clubError } = await supabaseAdmin
      .from('clubes')
      .select('mp_access_token, nombre, logo_url')
      .eq('id', clubId)
      .single();

    if (clubError || !club || !club.mp_access_token) {
      return NextResponse.json({ error: 'El club no tiene Mercado Pago configurado' }, { status: 400 });
    }

    const origin = dominioOrigen || req.headers.get('origin') || 'http://localhost:3000';

    // 2. Crear la preferencia de pago vía fetch nativo
    const preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${club.mp_access_token}`
      },
      body: JSON.stringify({
        items: [
          {
            id: `MENSUALIDAD-${jugadorId}`,
            title: `Mensualidad Academia - ${club.nombre}`,
            description: `Pago de mensualidad para ${nombreJugador}`,
            picture_url: club.logo_url || '',
            quantity: 1,
            unit_price: Number(monto),
            currency_id: 'COP',
          }
        ],
        payer: {
          email: email || 'cliente@email.com',
          name: nombreJugador,
        },
        back_urls: {
          success: `${origin}/futbolista/pagos?mp_status=success`,
          failure: `${origin}/futbolista/pagos?mp_status=failure`,
          pending: `${origin}/futbolista/pagos?mp_status=pending`,
        },
        auto_return: 'approved',
        notification_url: `https://masterclubmanager.com/api/mercadopago/webhook?clubId=${clubId}`,
        statement_descriptor: 'ACADEMIA',
        external_reference: `${jugadorId}_${Date.now()}`
      })
    });

    const result = await preferenceResponse.json();

    if (!preferenceResponse.ok) {
      console.error('Error MP:', result);
      return NextResponse.json({ error: 'Error al generar link de pago en Mercado Pago' }, { status: 500 });
    }

    return NextResponse.json({ url: result.init_point });
  } catch (error: any) {
    console.error('Error creando preferencia MP:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
