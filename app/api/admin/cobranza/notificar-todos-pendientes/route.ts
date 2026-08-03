import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { enviarMensajeWhatsAppServer } from '@/lib/whatsappServer';

export async function POST() {
  try {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];

    // 1. Obtener facturas no pagadas
    const { data: facturasPendientes } = await supabaseAdmin
      .from('facturacion_mensual')
      .select('club_id')
      .neq('estado_pago', 'pagado');

    const clubIdsFacturas = facturasPendientes?.map(f => f.club_id) || [];

    // 2. Obtener clubes vencidos o con facturas pendientes
    const { data: clubesMorosos } = await supabaseAdmin
      .from('clubes')
      .select('*, planes_saas(*)')
      .neq('estado', 'Eliminado')
      .or(`id.in.(${clubIdsFacturas.length > 0 ? clubIdsFacturas.join(',') : '00000000-0000-0000-0000-000000000000'}),proximo_corte.lte.${hoyStr}`);

    if (!clubesMorosos || clubesMorosos.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No hay clubes con saldos pendientes o membresía vencida para notificar.',
        enviados: 0,
        fallidos: 0 
      });
    }

    let enviados = 0;
    let fallidos = 0;
    const detalles: any[] = [];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    for (const club of clubesMorosos) {
      try {
        // Determinar teléfono
        let telefono = club.telefono_contacto;
        if (!telefono) {
          const { data: director } = await supabaseAdmin
            .from('perfiles')
            .select('telefono')
            .eq('club_id', club.id)
            .eq('rol', 'Director')
            .not('telefono', 'is', null)
            .limit(1)
            .maybeSingle();

          if (director?.telefono) telefono = director.telefono;
        }

        if (!telefono) {
          fallidos++;
          detalles.push({ club: club.nombre, estado: 'Sin teléfono registrado' });
          continue;
        }

        // Atletas
        const { count: atletasCount } = await supabaseAdmin
          .from('perfiles')
          .select('id', { count: 'exact', head: true })
          .eq('club_id', club.id)
          .eq('rol', 'Futbolista')
          .eq('estado_miembro', 'Activo');

        const totalAtletas = atletasCount || 0;

        // Factura pendiente más reciente
        const { data: f } = await supabaseAdmin
          .from('facturacion_mensual')
          .select('*')
          .eq('club_id', club.id)
          .neq('estado_pago', 'pagado')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const mesNombre = f?.periodo_mes ? meses[f.periodo_mes - 1] : meses[hoy.getMonth()];
        const anio = f?.periodo_anio || hoy.getFullYear();

        const plan = club.planes_saas;
        const precioBase = plan ? Number(plan.precio_base ?? 100000) : 100000;
        const limiteBase = plan ? Number(plan.limite_jugadores_base ?? 60) : 60;
        const precioExtra = plan ? Number(plan.precio_jugador_extra ?? 2000) : 2000;
        const extras = Math.max(0, totalAtletas - limiteBase);
        const montoCalculado = f?.total_pagar ? Number(f.total_pagar) : (precioBase + (extras * precioExtra));

        const fechaCorte = club.proximo_corte || `${anio}-${String(hoy.getMonth() + 1).padStart(2, '0')}-05`;

        const mensaje = `Hola *${club.nombre}* 👋⚽,\n\nUn cordial saludo de parte del equipo de *Master Club Manager (MCM)*.\n\nTe recordamos que se encuentra pendiente el aporte de tu mensualidad SaaS correspondiente a *${mesNombre} ${anio}*.\n\n📄 *Detalles de tu Suscripción:*\n• Plan: *${plan?.nombre || 'Estándar'}*\n• Atletas Activos: *${totalAtletas}*\n• Total a Pagar: *$ ${montoCalculado.toLocaleString('es-CO')}*\n• Fecha de Corte: *${fechaCorte}*\n\n💳 *Medios de Pago Disponibles:*\n• Nequi / Daviplata: *315 220 1608*\n• Bancolombia (Ahorros): *912-0000-8431*\n• Acceso Directo: *https://www.masterclubmanager.com/${club.slug}/login*\n\nPor favor envíanos tu comprobante por este medio una vez realizado el pago para mantener tu plataforma 100% activa. ¡Gracias por tu confianza! 🏆`;

        const resWA = await enviarMensajeWhatsAppServer(
          telefono,
          mensaje,
          undefined,
          'document',
          '',
          'gibbor'
        );

        if (resWA.success) {
          enviados++;
          detalles.push({ club: club.nombre, estado: 'Enviado exitosamente' });
        } else {
          fallidos++;
          detalles.push({ club: club.nombre, estado: 'Error en envío WhatsApp: ' + resWA.error });
        }

        // Pausa de 1.2 segundos entre envíos de lotes
        await new Promise(resolve => setTimeout(resolve, 1200));

      } catch (err: any) {
        fallidos++;
        detalles.push({ club: club.nombre, estado: 'Excepción: ' + err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Proceso completado. Enviados: ${enviados}, Fallidos: ${fallidos}`,
      enviados,
      fallidos,
      detalles
    });

  } catch (error: any) {
    console.error('Error enviando recordatorios SaaS masivos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
