import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generarReciboSaaSPDFBase64 } from '@/lib/recibo-saas-utils';
import { enviarMensajeWhatsAppServer } from '@/lib/whatsappServer';

export async function POST(request: Request) {
  try {
    const { pago_id } = await request.json();

    if (!pago_id) {
      return NextResponse.json({ error: 'Falta ID del pago' }, { status: 400 });
    }

    // 1. Obtener los datos del pago y de la factura asociada
    const { data: pago, error: errorPago } = await supabaseAdmin
      .from('pagos_saas')
      .select('*, facturacion_mensual(*, clubes(nombre, telefono_contacto, nombre_legal))')
      .eq('id', pago_id)
      .single();

    if (errorPago || !pago) throw new Error('Pago no encontrado');

    const factura = pago.facturacion_mensual;
    const club = factura?.clubes;

    if (!club?.telefono_contacto) {
      return NextResponse.json({ error: 'El club no tiene un teléfono de contacto configurado para WhatsApp.' }, { status: 400 });
    }

    // Nombres de los meses
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mesNombre = factura.periodo_mes ? meses[factura.periodo_mes - 1] : 'Mensualidad';
    const anio = factura.periodo_anio || new Date().getFullYear();

    // 2. Generar PDF
    const base64PDF = await generarReciboSaaSPDFBase64({
      clubNombre: club.nombre || 'Club Sin Nombre',
      clubDocumento: club.nombre_legal || 'N/A',
      clubTelefono: club.telefono_contacto,
      mesCobrado: `${mesNombre} ${anio}`,
      cantidadJugadores: factura.cantidad_jugadores || 0,
      montoTotal: Number(pago.monto_pagado),
      consecutivo: pago.id.split('-')[0], // Primer fragmento del UUID como consecutivo
      metodoPago: pago.metodo_pago || 'Transferencia',
      fechaPago: pago.fecha_pago
    });

    // 3. Enviar PDF por WhatsApp
    const mensajeTexto = `¡Hola! Adjuntamos tu comprobante de pago por la Suscripción a MCM App correspondiente a *${mesNombre} ${anio}*.\n\nGracias por confiar en nuestra plataforma tecnológica.`;
    
    await enviarMensajeWhatsAppServer(
      club.telefono_contacto,
      mensajeTexto,
      base64PDF,
      'document',
      `Recibo_MCM_${mesNombre}_${anio}.pdf`,
      'gibbor'
    );

    return NextResponse.json({ success: true, message: 'Recibo enviado correctamente' });
  } catch (error: any) {
    console.error('Error enviando recibo SaaS:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
