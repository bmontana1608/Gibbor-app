import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { enviarMensajeWhatsAppServer } from '@/lib/whatsappServer';
import { generarReciboSaaSPDFBase64 } from '@/lib/recibo-saas-utils';
import { buildBloquePago } from '@/lib/saas-pago-utils';

export async function POST(request: Request) {
  try {
    const { club_id, factura_id, mensajePersonalizado } = await request.json();

    if (!club_id) {
      return NextResponse.json({ error: 'Falta ID del club' }, { status: 400 });
    }

    // 1. Obtener datos del club y su plan SaaS
    const { data: club, error: errorClub } = await supabaseAdmin
      .from('clubes')
      .select('*, planes_saas(*)')
      .eq('id', club_id)
      .single();

    if (errorClub || !club) {
      return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 });
    }

    // 2. Determinar el teléfono de destino (telefono_contacto del club o teléfono de su Director)
    let telefono = club.telefono_contacto;

    if (!telefono) {
      const { data: director } = await supabaseAdmin
        .from('perfiles')
        .select('telefono')
        .eq('club_id', club_id)
        .eq('rol', 'Director')
        .not('telefono', 'is', null)
        .limit(1)
        .maybeSingle();

      if (director?.telefono) {
        telefono = director.telefono;
      }
    }

    if (!telefono) {
      return NextResponse.json({ 
        error: `El club "${club.nombre}" no tiene un teléfono de contacto ni director con WhatsApp registrado.` 
      }, { status: 400 });
    }

    // 3. Obtener atletas activos del club
    const { count: atletasCount } = await supabaseAdmin
      .from('perfiles')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', club_id)
      .eq('rol', 'Futbolista')
      .eq('estado_miembro', 'Activo');

    const totalAtletas = atletasCount || 0;

    // 4. Obtener factura específica o la más reciente no pagada
    let factura: any = null;
    if (factura_id) {
      const { data: f } = await supabaseAdmin
        .from('facturacion_mensual')
        .select('*')
        .eq('id', factura_id)
        .maybeSingle();
      factura = f;
    } else {
      const { data: f } = await supabaseAdmin
        .from('facturacion_mensual')
        .select('*')
        .eq('club_id', club_id)
        .neq('estado_pago', 'pagado')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      factura = f;
    }

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const hoy = new Date();
    const mesNombre = factura?.periodo_mes ? meses[factura.periodo_mes - 1] : meses[hoy.getMonth()];
    const anio = factura?.periodo_anio || hoy.getFullYear();

    const plan = club.planes_saas;
    const precioBase = plan ? Number(plan.precio_base ?? 100000) : 100000;
    const limiteBase = plan ? Number(plan.limite_jugadores_base ?? 60) : 60;
    const precioExtra = plan ? Number(plan.precio_jugador_extra ?? 2000) : 2000;
    const extras = Math.max(0, totalAtletas - limiteBase);
    const montoCalculado = factura?.total_pagar ? Number(factura.total_pagar) : (precioBase + (extras * precioExtra));

    const fechaCorte = club.proximo_corte || `${anio}-${String(hoy.getMonth() + 1).padStart(2, '0')}-05`;

    let mensajeFinal = mensajePersonalizado;

    if (!mensajeFinal) {
      // Obtener medios de pago configurados por el Super Admin
      const { data: configSuperAdmin } = await supabaseAdmin
        .from('configuracion_superadmin')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      const bloquePago = buildBloquePago(configSuperAdmin || {});

      // Formatear fecha de corte legible
      let fechaCorteStr = fechaCorte;
      try {
        fechaCorteStr = new Date(fechaCorte).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
      } catch (e) {}

      mensajeFinal = `Hola *${club.nombre}* 👋⚽,\n\nUn cordial saludo de parte del equipo de *Master Club Manager (MCM)*.\n\nTe recordamos que se encuentra pendiente el aporte de tu mensualidad SaaS correspondiente a *${mesNombre} ${anio}*.\n\n📄 *Detalles de tu Suscripción:*\n• Plan: *${plan?.nombre || 'Estándar'}*\n• Atletas Activos: *${totalAtletas}*\n• Total a Pagar: *$ ${montoCalculado.toLocaleString('es-CO')}*\n• Fecha de Corte: *${fechaCorteStr}*\n\n💳 *Medios de Pago Disponibles:*\n${bloquePago}\n• Acceso Directo: *https://www.masterclubmanager.com/${club.slug}/login*\n\nPor favor envíanos tu comprobante por este medio una vez realizado el pago para mantener tu plataforma 100% activa. ¡Gracias por tu confianza! 🏆`;
    }

    // 5. Generar PDF de Recibo SaaS con Logo Oficial MCM
    let base64PDF: string | undefined = undefined;
    try {
      base64PDF = await generarReciboSaaSPDFBase64({
        clubNombre: club.nombre || 'Club Sin Nombre',
        clubDocumento: club.nombre_legal || 'N/A',
        clubTelefono: telefono,
        mesCobrado: `${mesNombre} ${anio}`,
        cantidadJugadores: totalAtletas,
        montoTotal: montoCalculado,
        consecutivo: factura?.id ? factura.id.split('-')[0] : '0001',
        metodoPago: 'Suscripción SaaS',
        fechaPago: hoy.toISOString()
      });
    } catch (e) {
      console.error('Error generando PDF recibo SaaS:', e);
    }

    // 6. Enviar mensaje por el canal maestro de WhatsApp ('gibbor') adjuntando el recibo PDF
    const result = await enviarMensajeWhatsAppServer(
      telefono,
      mensajeFinal,
      base64PDF,
      'document',
      `Recibo_SaaS_${club.nombre.replace(/\s+/g, '_')}_${mesNombre}.pdf`,
      'gibbor'
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Error al enviar por WhatsApp' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Recordatorio de cobranza enviado exitosamente a ${club.nombre}`,
      telefono 
    });

  } catch (error: any) {
    console.error('Error enviando recordatorio SaaS:', error);
    return NextResponse.json({ error: error.message || 'Error interno en el servidor' }, { status: 500 });
  }
}
