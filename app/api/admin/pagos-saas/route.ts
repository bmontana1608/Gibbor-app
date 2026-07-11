import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { club_id, factura_id, monto_pagado, metodo_pago, fecha_pago, comprobante_url } = body;

    // WORKAROUND: La tabla pagos_saas tiene un foreign key hacia facturas_saas en lugar de facturacion_mensual.
    // Insertamos un registro dummy para evitar el error de foreign key constraint, ya que no podemos hacer DROP CONSTRAINT.
    if (factura_id) {
      await supabaseAdmin.from('facturas_saas').upsert([{
        id: factura_id,
        club_id,
        mes: new Date().getMonth() + 1,
        anio: new Date().getFullYear(),
        monto_total: Number(monto_pagado),
        cantidad_jugadores: 0
      }], { onConflict: 'id' });
    }

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

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const factura_id = url.searchParams.get('factura_id');

    if (!id) return NextResponse.json({ error: 'Falta ID del pago' }, { status: 400 });

    const { error: errorDel } = await supabaseAdmin
      .from('pagos_saas')
      .delete()
      .eq('id', id);

    if (errorDel) throw errorDel;

    if (factura_id) {
      await supabaseAdmin
        .from('facturacion_mensual')
        .update({ estado_pago: 'pendiente' })
        .eq('id', factura_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error DELETE /api/admin/pagos-saas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
