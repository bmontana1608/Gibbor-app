import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
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

    // 2. Inicializar Mercado Pago CON EL TOKEN DEL CLUB (El dinero va directo a ellos)
    const client = new MercadoPagoConfig({ accessToken: club.mp_access_token });
    const preference = new Preference(client);

    const origin = dominioOrigen || req.headers.get('origin') || 'http://localhost:3000';

    // 3. Crear la preferencia de pago
    const result = await preference.create({
      body: {
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
        external_reference: `${clubId}_${jugadorId}_${monto}`, // Guardamos metadatos para el webhook
        statement_descriptor: 'MENSUALIDAD MCM',
      }
    });

    // 4. Retornar la URL de Checkout (init_point)
    return NextResponse.json({ url: result.init_point });
  } catch (error: any) {
    console.error('Mercado Pago Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
