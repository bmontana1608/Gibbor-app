import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { club_id, factura_id, monto_pagado, metodo_pago, fecha_pago, comprobante_url } = body;

    // 1. Guardar en pagos_saas usando supabaseAdmin (bypasses RLS)
    const { error: errorPago } = await supabaseAdmin
      .from('pagos_saas')
      .insert([{
        club_id,
        factura_id,
        monto_pagado: Number(monto_pagado),
        metodo_pago,
        fecha_pago,
        comprobante_url: comprobante_url || null,
        estado: 'Aprobado'
      }]);

    if (errorPago) throw errorPago;

    // 2. Marcar factura como pagada en facturacion_mensual si existe
    if (factura_id) {
      const { error: errorFactura } = await supabaseAdmin
        .from('facturacion_mensual')
        .update({ estado_pago: 'pagado' })
        .eq('id', factura_id);

      if (errorFactura) throw errorFactura;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in /api/admin/pagos-saas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
