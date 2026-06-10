import { NextResponse } from 'next/server';
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
    const clubId = url.searchParams.get('clubId');

    if ((action === 'payment' || action === 'payment.created') && paymentId && clubId) {
      
      // 1. Obtener el token del club
      const { data: club } = await supabaseAdmin
        .from('clubes')
        .select('mp_access_token')
        .eq('id', clubId)
        .single();
        
      if (!club || !club.mp_access_token) return NextResponse.json({ error: 'Club not configured' }, { status: 400 });

      // 2. Consultar el pago en MP
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${club.mp_access_token}` }
      });
      const paymentData = await res.json();

      if (paymentData.status === 'approved') {
        const external_reference = paymentData.external_reference;
        if (external_reference) {
          const [extClubId, jugadorId, monto] = external_reference.split('_');

          // Verificar si ya se procesó (por si Mercado Pago envía el webhook duplicado)
          const { data: existing } = await supabaseAdmin.from('pagos_ingresos').select('id').eq('notas', `MP_ID:${paymentId}`).single();
          
          if (!existing) {
             // 3. Obtener datos del jugador
             const { data: jugador } = await supabaseAdmin.from('perfiles').select('nombres, apellidos, grupos').eq('id', jugadorId).single();
             
             // 4. Obtener el consecutivo
             const { data: maxConsecutivo } = await supabaseAdmin
               .from('pagos_ingresos')
               .select('consecutivo')
               .eq('club_id', clubId)
               .order('consecutivo', { ascending: false })
               .limit(1)
               .single();
             const nextConsecutivo = (maxConsecutivo?.consecutivo || 0) + 1;

             // 5. Registrar el ingreso
             await supabaseAdmin.from('pagos_ingresos').insert({
                club_id: clubId,
                jugador_id: jugadorId,
                nombres: jugador?.nombres || 'Jugador',
                apellidos: jugador?.apellidos || '',
                grupo: jugador?.grupos || 'GENERAL',
                monto_base: Number(monto),
                descuento: 0,
                recargo: 0,
                total: Number(monto),
                metodo_pago: 'Mercado Pago',
                notas: `MP_ID:${paymentId}`,
                fecha: new Date().toISOString(),
                consecutivo: nextConsecutivo
             });

             // 6. Marcar al jugador como 'Al Día'
             await supabaseAdmin.from('perfiles').update({ estado_pago: 'Al Día' }).eq('id', jugadorId);
          }
        }
      }

      return NextResponse.json({ received: true, id: paymentId });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Mercado Pago Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
