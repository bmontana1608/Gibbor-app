import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { enviarMensajeWhatsAppServer } from '@/lib/whatsappServer';

export async function GET(request: Request) {
  try {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];

    // Buscar clubes cuyo proximo_corte sea hoy o haya pasado y tengan suscripción activa/pendiente
    const { data: clubesPendientes, error } = await supabaseAdmin
      .from('clubes')
      .select('*, planes_saas(*)')
      .neq('estado', 'Eliminado')
      .lte('proximo_corte', hoyStr);

    if (error || !clubesPendientes || clubesPendientes.length === 0) {
      return NextResponse.json({ message: 'No hay clubes con cobranza pendiente hoy.' });
    }

    let enviados = 0;
    let fallidos = 0;
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // Obtener medios de pago configurados por el Super Admin
    const { data: configSuperAdmin } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    const nequi = configSuperAdmin?.saas_nequi || '315 220 1608';
    const daviplata = configSuperAdmin?.saas_daviplata || '315 220 1608';
    const breB = configSuperAdmin?.saas_bre_b || '@DAVIBMT801';
    const bancolombia = configSuperAdmin?.saas_bancolombia || '912-0000-8431 (Ahorros)';

    const lineasPago: string[] = [];
    if (nequi) lineasPago.push(`• Nequi: *${nequi}*`);
    if (daviplata) lineasPago.push(`• Daviplata: *${daviplata}*`);
    if (breB) lineasPago.push(`• Llave Bre-B / Daviplata: *${breB}*`);
    if (bancolombia) lineasPago.push(`• Bancolombia: *${bancolombia}*`);

    const bloquePago = lineasPago.join('\n');

    for (const club of clubesPendientes) {
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
        continue;
      }

      const { count: atletasCount } = await supabaseAdmin
        .from('perfiles')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', club.id)
        .eq('rol', 'Futbolista')
        .eq('estado_miembro', 'Activo');

      const totalAtletas = atletasCount || 0;
      const plan = club.planes_saas;
      const precioBase = plan ? Number(plan.precio_base ?? 100000) : 100000;
      const limiteBase = plan ? Number(plan.limite_jugadores_base ?? 60) : 60;
      const precioExtra = plan ? Number(plan.precio_jugador_extra ?? 2000) : 2000;
      const extras = Math.max(0, totalAtletas - limiteBase);
      const montoCalculado = precioBase + (extras * precioExtra);

      const mesNombre = meses[hoy.getMonth()];
      const anio = hoy.getFullYear();

      const mensaje = `Hola *${club.nombre}* 👋⚽,\n\nTe recordamos desde la administración de *Master Club Manager (MCM)* que tu fecha de corte de suscripción SaaS (*${club.proximo_corte}*) ha llegado o se encuentra pendiente.\n\n📄 *Resumen de Suscripción:*\n• Plan: *${plan?.nombre || 'Estándar'}*\n• Atletas Activos: *${totalAtletas}*\n• Valor a Regularizar: *$ ${montoCalculado.toLocaleString('es-CO')}*\n\n💳 *Medios de Pago:*\n${bloquePago}\n• Acceso Directo: *https://www.masterclubmanager.com/${club.slug}/login*\n\nAgradecemos tu oportuno pago para mantener el servicio activo sin interrupciones. 🏆`;

      const result = await enviarMensajeWhatsAppServer(
        telefono,
        mensaje,
        undefined,
        'document',
        '',
        'gibbor'
      );

      if (result.success) enviados++;
      else fallidos++;

      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return NextResponse.json({
      success: true,
      procesados: clubesPendientes.length,
      enviados,
      fallidos
    });

  } catch (error: any) {
    console.error('Error en cron de recordatorios SaaS:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
