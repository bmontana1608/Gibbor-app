import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('type') || url.searchParams.get('topic');
    const paymentId = url.searchParams.get('data.id') || url.searchParams.get('id');

    // Solo nos interesan las notificaciones de pago
    if ((action === 'payment' || action === 'payment.created') && paymentId) {
      
      // Dado que el pago pertenece a un club (y su access_token), no podemos simplemente
      // consultarlo con nuestro token de plataforma. PERO, si configuramos el webhook general,
      // necesitamos buscar el pago. O mejor aún, Mercado Pago envía el external_reference en el webhook a veces.
      // Si no tenemos el token aquí, ¿cómo leemos el pago?
      // Solución B2B2C: Guardamos el token en la base de datos y lo buscamos por external_reference? No, no viene en la URL.
      // En Mercado Pago Connect, si usamos notificaciones IPN, necesitamos el token del vendedor.
      // Para simplificar: En un entorno de múltiples clubes, usualmente usamos "OAuth" y el webhook recibe el user_id del vendedor.
      
      // *Temporalmente* para hacer que funcione la lógica base asumiendo un club:
      // (En producción requeriremos asociar el payment_id al token del club, lo cual MP hace enviando el `user_id` del vendedor)
      
      // 1. Aquí idealmente consultarías el pago usando el token del club.
      // Como workaround rápido, si tu aplicación está bajo tu cuenta principal, puedes intentar leerlo si tienes permisos de aplicación.
      
      console.log(`Pago recibido ID: ${paymentId}`);
      // Lógica de Supabase:
      // Si logras leer la `external_reference` (que es `clubId_jugadorId_monto`), puedes extraer los IDs:
      // const [clubId, jugadorId, monto] = external_reference.split('_');
      //
      // await supabaseAdmin.from('perfiles').update({ estado_pago: 'Al día' }).eq('id', jugadorId);
      // await supabaseAdmin.from('pagos_ingresos').insert([...])
      
      return NextResponse.json({ received: true, id: paymentId });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Mercado Pago Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
