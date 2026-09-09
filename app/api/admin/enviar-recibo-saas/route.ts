import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generarReciboSaaSPDFBase64 } from '@/lib/recibo-saas-utils';
import { enviarMensajeWhatsAppServer } from '@/lib/whatsappServer';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      pago_id, 
      factura_id, 
      club_id, 
      monto, 
      periodo_mes, 
      periodo_anio, 
      atletas, 
      fecha_vencimiento,
      telefono_override, 
      mensaje_override 
    } = body;

    if (!pago_id && !factura_id && !club_id) {
      return NextResponse.json({ error: 'Se requiere pago_id, factura_id o club_id' }, { status: 400 });
    }

    // 1. Cargar canales de pago configurados en configuracion_superadmin
    const { data: configAdmin } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    const canales = configAdmin?.canales_pago || {
      banco_nombre: 'Bancolombia Ahorros',
      banco_numero: '3124265170',
      nequi: '3124265170',
      daviplata: '3124265170',
      bre_b: '3124265170',
      titular: 'Master Club Manager'
    };

    const canalesTexto = [
      canales.banco_nombre && canales.banco_numero ? `• ${canales.banco_nombre}: *${canales.banco_numero}*` : '',
      canales.nequi ? `• Nequi: *${canales.nequi}*` : '',
      canales.daviplata ? `• Daviplata: *${canales.daviplata}*` : '',
      canales.bre_b ? `• Llave Bre-B: *${canales.bre_b}*` : '',
      canales.titular ? `• Titular: *${canales.titular}*` : '',
    ].filter(Boolean).join('\n');

    let club: any = null;
    let base64PDF = '';
    let mensajeTexto = '';
    let filename = 'Recibo_MCM.pdf';

    // ==========================================
    // CASO 1: PAGO CONFIRMADO (Historial de Pagos)
    // ==========================================
    if (pago_id) {
      const { data: pago, error: errorPago } = await supabaseAdmin
        .from('pagos_saas')
        .select('*')
        .eq('id', pago_id)
        .single();

      if (errorPago || !pago) throw new Error('Pago no encontrado');

      const { data: clubData } = await supabaseAdmin
        .from('clubes')
        .select('id, nombre, telefono_contacto, nombre_legal, email')
        .eq('id', pago.club_id)
        .single();
      club = clubData;

      let factura: any = null;
      if (pago.factura_id) {
        const { data: facturaData } = await supabaseAdmin
          .from('facturacion_mensual')
          .select('*')
          .eq('id', pago.factura_id)
          .single();
        factura = facturaData;
      }

      const mesNombre = factura?.periodo_mes ? MESES[factura.periodo_mes - 1] : MESES[new Date(pago.fecha_pago || Date.now()).getMonth()];
      const anio = factura?.periodo_anio || new Date(pago.fecha_pago || Date.now()).getFullYear();
      const consecutivo = `REC-${pago.id.slice(0, 6).toUpperCase()}`;
      filename = `Recibo_Pago_MCM_${mesNombre}_${anio}_${(club?.nombre || 'Club').replace(/\s+/g, '_')}.pdf`;

      base64PDF = await generarReciboSaaSPDFBase64({
        clubNombre: club?.nombre || 'Club Deportivo',
        clubDocumento: club?.nombre_legal || 'N/A',
        clubTelefono: club?.telefono_contacto,
        mesCobrado: `${mesNombre} ${anio}`,
        cantidadJugadores: factura?.cantidad_jugadores || atletas || 0,
        montoTotal: Number(pago.monto_pagado),
        consecutivo: consecutivo,
        metodoPago: pago.metodo_pago || 'Transferencia',
        fechaPago: pago.fecha_pago || new Date().toISOString().split('T')[0],
        estado: 'PAGADO'
      });

      mensajeTexto = mensaje_override || `¡Hola directores de *${club?.nombre || 'Club'}*! 👋\n\nHemos recibido y confirmado exitosamente su pago de suscripción a Master Club Manager por un valor de *$${Number(pago.monto_pagado).toLocaleString('es-CO')} COP* correspondiente a *${mesNombre} ${anio}*.\n\nAdjuntamos su *Recibo Oficial de Pago*. Su membresía y servicios continúan activos al 100%.\n\n¡Gracias por seguir creciendo junto a nosotros! ⚽✨`;
    } 
    // ==========================================
    // CASO 2: FACTURA EMITIDA (Tab Facturas)
    // ==========================================
    else if (factura_id) {
      const { data: factura, error: errorFac } = await supabaseAdmin
        .from('facturacion_mensual')
        .select('*, clubes(*)')
        .eq('id', factura_id)
        .single();

      if (errorFac || !factura) throw new Error('Factura no encontrada');
      club = factura.clubes;

      const mesNombre = factura.periodo_mes ? MESES[factura.periodo_mes - 1] : MESES[new Date().getMonth()];
      const anio = factura.periodo_anio || new Date().getFullYear();
      const esPagado = factura.estado_pago === 'pagado';
      const fechaVenc = fecha_vencimiento || club?.proximo_corte || `10/${factura.periodo_mes}/${anio}`;
      const consecutivo = `FAC-${anio}${String(factura.periodo_mes).padStart(2, '0')}-${factura.id.slice(0, 4).toUpperCase()}`;
      filename = `Cuenta_Cobro_MCM_${mesNombre}_${anio}_${(club?.nombre || 'Club').replace(/\s+/g, '_')}.pdf`;

      base64PDF = await generarReciboSaaSPDFBase64({
        clubNombre: club?.nombre || 'Club Deportivo',
        clubDocumento: club?.nombre_legal || 'N/A',
        clubTelefono: club?.telefono_contacto,
        mesCobrado: `${mesNombre} ${anio}`,
        cantidadJugadores: factura.cantidad_jugadores || 0,
        montoTotal: Number(factura.total_pagar),
        consecutivo: consecutivo,
        fechaPago: esPagado ? new Date().toISOString().split('T')[0] : undefined,
        fechaVencimiento: fechaVenc,
        estado: esPagado ? 'PAGADO' : 'COBRO',
        canalesPago: canalesTexto
      });

      if (esPagado) {
        mensajeTexto = mensaje_override || `¡Hola directores de *${club?.nombre || 'Club'}*! 👋\n\nAdjuntamos el comprobante de su factura de suscripción a Master Club Manager correspondiente a *${mesNombre} ${anio}* por valor de *$${Number(factura.total_pagar).toLocaleString('es-CO')} COP*, la cual se encuentra registrada como *PAGADA*.\n\n¡Gracias por su puntualidad y confianza! ⚽✨`;
      } else {
        mensajeTexto = mensaje_override || `Hola directores de *${club?.nombre || 'Club'}* 👋\n\nLes compartimos la *Cuenta de Cobro* correspondiente al periodo de *${mesNombre} ${anio}* por la suscripción a la plataforma tecnológica Master Club Manager.\n\n📋 *Detalle del Servicio:*\n• Academia: *${club?.nombre}*\n• Atletas Activos: *${factura.cantidad_jugadores || 0}*\n• Total a Pagar: *$${Number(factura.total_pagar).toLocaleString('es-CO')} COP*\n• Fecha Límite / Corte: *${fechaVenc}*\n\n💳 *Canales de Pago Oficiales:*\n${canalesTexto}\n\nAdjuntamos la cuenta de cobro en formato PDF. Al realizar la consignación, por favor envíenos el soporte de pago por este medio.\n\n¡Gracias por confiar en *Master Club Manager*! ⚽🚀`;
      }
    }
    // ==========================================
    // CASO 3: COBRO DIRECTO AL CLUB (Tab Estado de Cuentas)
    // ==========================================
    else if (club_id) {
      const { data: clubData, error: errorClub } = await supabaseAdmin
        .from('clubes')
        .select('*, planes_saas(*)')
        .eq('id', club_id)
        .single();

      if (errorClub || !clubData) throw new Error('Club no encontrado');
      club = clubData;

      // Calcular atletas activos si no vienen dados
      let numAtletas = atletas;
      if (numAtletas === undefined) {
        const { count } = await supabaseAdmin
          .from('perfiles')
          .select('id', { count: 'exact', head: true })
          .eq('club_id', club.id)
          .eq('estado_miembro', 'Activo')
          .eq('rol', 'Futbolista');
        numAtletas = count || 0;
      }

      // Calcular valor si no viene dado
      let totalCobro = monto;
      if (!totalCobro) {
        const plan = club.planes_saas;
        const precioBase = plan ? Number(plan.precio_base ?? 100000) : 100000;
        const limiteBase = plan ? Number(plan.limite_jugadores_base ?? 60) : 60;
        const precioExtra = plan ? Number(plan.precio_jugador_extra ?? 2000) : 2000;
        const extras = Math.max(0, numAtletas - limiteBase);
        totalCobro = precioBase + (extras * precioExtra);
      }

      const mesIndex = (periodo_mes !== undefined ? Number(periodo_mes) - 1 : new Date().getMonth());
      const mesNombre = MESES[mesIndex];
      const anio = periodo_anio || new Date().getFullYear();
      const fechaVenc = fecha_vencimiento || club.proximo_corte || `10/${mesIndex + 1}/${anio}`;
      const consecutivo = `COB-${anio}${String(mesIndex + 1).padStart(2, '0')}-${club.id.slice(0, 4).toUpperCase()}`;
      filename = `Cuenta_Cobro_SaaS_${mesNombre}_${anio}_${club.nombre.replace(/\s+/g, '_')}.pdf`;

      base64PDF = await generarReciboSaaSPDFBase64({
        clubNombre: club.nombre || 'Club Deportivo',
        clubDocumento: club.nombre_legal || 'N/A',
        clubTelefono: club.telefono_contacto,
        mesCobrado: `${mesNombre} ${anio}`,
        cantidadJugadores: numAtletas,
        montoTotal: Number(totalCobro),
        consecutivo: consecutivo,
        fechaVencimiento: fechaVenc,
        estado: 'COBRO',
        canalesPago: canalesTexto,
        planNombre: club.planes_saas?.nombre || 'Plan SaaS'
      });

      mensajeTexto = mensaje_override || `Hola directores de *${club.nombre}* 👋\n\nLes compartimos la *Cuenta de Cobro* correspondiente al periodo de *${mesNombre} ${anio}* por la suscripción a la plataforma tecnológica Master Club Manager.\n\n📋 *Detalle del Servicio:*\n• Academia: *${club.nombre}*\n• Atletas Activos: *${numAtletas}*\n• Total a Pagar: *$${Number(totalCobro).toLocaleString('es-CO')} COP*\n• Fecha Límite / Corte: *${fechaVenc}*\n\n💳 *Canales de Pago Oficiales:*\n${canalesTexto}\n\nAdjuntamos la cuenta de cobro en formato PDF con los detalles del servicio. Al realizar la consignación, por favor envíenos el comprobante.\n\n¡Gracias por confiar en *Master Club Manager*! ⚽🚀`;
    }

    // Teléfono de destino
    const telefonoDestino = telefono_override || club?.telefono_contacto;
    if (!telefonoDestino) {
      return NextResponse.json({ 
        error: `El club "${club?.nombre || 'seleccionado'}" no tiene un teléfono de contacto registrado para WhatsApp.` 
      }, { status: 400 });
    }

    // Enviar a través del bot Evolution API (instancia mcm-ventas o fallback gibbor)
    const envioResultado = await enviarMensajeWhatsAppServer(
      telefonoDestino,
      mensajeTexto,
      base64PDF,
      'document',
      filename,
      'mcm-ventas'
    );

    return NextResponse.json({ 
      success: true, 
      message: `Recibo enviado exitosamente por WhatsApp a ${club?.nombre || 'el club'}`,
      resultado: envioResultado 
    });

  } catch (error: any) {
    console.error('Error enviando recibo SaaS WhatsApp:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar el envío' }, { status: 500 });
  }
}
