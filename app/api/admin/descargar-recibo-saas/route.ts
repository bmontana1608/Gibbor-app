import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generarReciboSaaSPDFBase64 } from '@/lib/recibo-saas-utils';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pago_id = url.searchParams.get('pago_id');

    if (!pago_id) {
      return new NextResponse('Falta ID del pago', { status: 400 });
    }

    // 1. Obtener los datos del pago
    const { data: pago, error: errorPago } = await supabaseAdmin
      .from('pagos_saas')
      .select('*, facturacion_mensual(*, clubes(nombre, telefono_contacto, nombre_legal))')
      .eq('id', pago_id)
      .single();

    if (errorPago || !pago) return new NextResponse('Pago no encontrado', { status: 404 });

    const factura = pago.facturacion_mensual;
    const club = factura?.clubes || { nombre: 'Club Desconocido', nombre_legal: 'N/A', telefono_contacto: '' };

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mesNombre = factura?.periodo_mes ? meses[factura.periodo_mes - 1] : 'Mensualidad';
    const anio = factura?.periodo_anio || new Date().getFullYear();

    // 2. Generar PDF en Base64
    const base64PDF = await generarReciboSaaSPDFBase64({
      clubNombre: club.nombre || 'Club Sin Nombre',
      clubDocumento: club.nombre_legal || 'N/A',
      clubTelefono: club.telefono_contacto || '',
      mesCobrado: `${mesNombre} ${anio}`,
      cantidadJugadores: factura?.cantidad_jugadores || 0,
      montoTotal: Number(pago.monto_pagado),
      consecutivo: pago.id.split('-')[0], 
      metodoPago: pago.metodo_pago || 'Transferencia',
      fechaPago: pago.fecha_pago
    });

    // 3. Convertir Base64 a Buffer binario para enviarlo como archivo
    const pdfBuffer = Buffer.from(base64PDF, 'base64');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Recibo_MCM_${club.nombre.replace(/\s+/g, '_')}_${mesNombre}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Error descargando recibo SaaS:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
