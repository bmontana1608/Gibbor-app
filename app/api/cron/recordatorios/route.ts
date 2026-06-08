import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const today = new Date();
    const day = today.getDate();

    // Solo ejecutamos lógica si es el día 5, 10 o 25
    if (day !== 5 && day !== 10 && day !== 25) {
      return NextResponse.json({ message: `Día ${day}: No hay envíos programados para hoy.` });
    }

    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentYear = String(today.getFullYear());
    const matchMesAnio = `${currentYear}-${currentMonth}`;

    // 1. Obtener clubes con webhook activo
    const { data: configsWA, error: waError } = await supabaseAdmin
      .from('configuracion_wa')
      .select('club_id, nombre_club, active_webhook, nequi, daviplata, bre_b, banco_nombre, banco_numero')
      .eq('active_webhook', true);

    if (waError || !configsWA || configsWA.length === 0) {
      return NextResponse.json({ message: 'No hay clubes con WhatsApp configurado' });
    }

    const clubIds = configsWA.map(c => c.club_id);

    // 2. Obtener pagos de este mes para los clubes habilitados
    // Consultamos pagos usando texto LIKE o similar
    const { data: pagosEsteMes, error: pagosError } = await supabaseAdmin
      .from('pagos_ingresos')
      .select('jugador_id')
      .in('club_id', clubIds)
      .like('fecha', `${matchMesAnio}%`);

    if (pagosError) {
      console.error('Error obteniendo pagos:', pagosError);
      return NextResponse.json({ error: 'Error BD pagos' }, { status: 500 });
    }

    const idsPagados = new Set(pagosEsteMes?.map(p => p.jugador_id) || []);

    // 3. Obtener jugadores activos de estos clubes (excluir entrenadores/directores)
    const { data: jugadores, error: jugError } = await supabaseAdmin
      .from('perfiles')
      .select('id, nombres, apellidos, telefono, club_id, tipo_plan')
      .in('club_id', clubIds)
      .eq('estado_miembro', 'Activo')
      .not('rol', 'in', '("Director","Entrenador")');

    if (jugError) {
      console.error('Error obteniendo jugadores:', jugError);
      return NextResponse.json({ error: 'Error BD jugadores' }, { status: 500 });
    }

    // 4. Obtener planes de estos clubes para calcular la tarifa (opcional si es necesario mostrar tarifa)
    const { data: planes } = await supabaseAdmin
      .from('planes')
      .select('nombre, precio_base, descuento_pronto_pago, dias_limite_pronto_pago, club_id')
      .in('club_id', clubIds);

    const mensajesEncolados = [];

    for (const jugador of jugadores || []) {
      if (!jugador.telefono) continue;
      
      // Limpiar número (remover espacios o guiones y añadir 57 si tiene 10 dígitos)
      let cleanedNumber = String(jugador.telefono).replace(/\D/g, '');
      if (cleanedNumber.length === 10) cleanedNumber = `57${cleanedNumber}`;
      if (cleanedNumber.length < 10) continue; // Número inválido

      // Si ya pagó, no notificar
      if (idsPagados.has(jugador.id)) continue;

      const configClub = configsWA.find(c => c.club_id === jugador.club_id);
      if (!configClub) continue;

      // Determinar la tarifa usando lógica similar al frontend
      let tarifaBase = 0;
      let montoPagar = 0;
      let descuentoAplica = 0;

      if (planes) {
        const plan = planes.find(p => p.club_id === jugador.club_id && p.nombre === jugador.tipo_plan);
        if (plan) {
          tarifaBase = Number(plan.precio_base) || 0;
          const limitePP = Number(plan.dias_limite_pronto_pago) || 5;
          const descuento = Number(plan.descuento_pronto_pago) || 0;
          
          const planLabel = (jugador.tipo_plan || '').toLowerCase();
          const esBeca = planLabel.includes('beca');

          // El descuento aplica solo hasta el día 5
          if (!esBeca && day <= limitePP) {
            descuentoAplica = descuento;
            montoPagar = tarifaBase - descuento;
          } else {
            montoPagar = tarifaBase;
          }
        }
      }

      if (montoPagar <= 0) continue; // Si es beca total o 0, no cobrar

      // Definir los métodos de pago disponibles del club
      const metodosPago = [
        configClub.nequi ? `Nequi: *${configClub.nequi}*` : '',
        configClub.daviplata ? `Daviplata: *${configClub.daviplata}*` : '',
        configClub.bre_b ? `Bre-B: *${configClub.bre_b}*` : '',
        configClub.banco_nombre && configClub.banco_numero ? `${configClub.banco_nombre}: *${configClub.banco_numero}*` : ''
      ].filter(Boolean).join('\n');

      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const mesNombre = meses[today.getMonth()];
      const nombreClub = configClub.nombre_club || 'tu club';

      let mensaje = '';

      if (day === 5) {
        // RECORDATORIO DÍA 5 - VENCIMIENTO PRONTO PAGO
        mensaje = `Hola ${jugador.nombres} 👋⚽,\n\nEsperamos que te encuentres muy bien.\n\nDesde *${nombreClub}* te recordamos que hoy finaliza el periodo de recaudo para la mensualidad de *${mesNombre}*.\n\n📄 Tu valor a pagar es de: *$${montoPagar.toLocaleString('es-CO')}*.\n${descuentoAplica > 0 ? `(Incluye tu descuento de pronto pago válido hasta hoy).\n\n` : '\n'}Para facilitar tu proceso, puedes hacer el pago a través de:\n\n${metodosPago || 'Efectivo en nuestras instalaciones'}\n\nSi ya realizaste tu pago, te agradecemos enviarnos el comprobante por este medio. ¡Sigamos trabajando juntos por tus metas! 🏆`;
      } 
      else if (day === 10) {
        // RECORDATORIO DÍA 10 - POST VENCIMIENTO (Sin descuento)
        mensaje = `Hola ${jugador.nombres} 👋,\n\nUn cordial saludo de parte de *${nombreClub}*.\n\nNotamos que aún está pendiente el aporte de tu mensualidad correspondiente a *${mesNombre}*. Entendemos que a veces las fechas se nos pasan, por lo que queremos recordarte la importancia de mantenerte al día para garantizar el funcionamiento del club y la continuidad en tus entrenamientos.\n\n📄 Tu saldo pendiente es de: *$${montoPagar.toLocaleString('es-CO')}*.\n\nPuedes regularizar tu estado a través de:\n\n${metodosPago || 'Nuestros canales habituales'}\n\nQuedamos atentos a recibir tu comprobante. ¡Gracias por tu compromiso institucional! ⚽`;
      }
      else if (day === 25) {
        // RECORDATORIO DÍA 25 - AVISO PRE-SUSPENSIÓN (Firmeza)
        mensaje = `Estimado(a) ${jugador.nombres},\n\nNos dirigimos a ti desde la administración de *${nombreClub}*.\n\nA la fecha, nuestro sistema refleja un saldo pendiente por tu mensualidad de *${mesNombre}* por valor de *$${montoPagar.toLocaleString('es-CO')}*.\n\nEl cumplimiento oportuno de los aportes es fundamental para el sostenimiento del proyecto deportivo. Por normatividad interna, el no pago puede acarrear restricciones en la participación activa.\n\nTe solicitamos amablemente ponerte al día a la mayor brevedad posible utilizando nuestros canales:\n\n${metodosPago || 'Atención en sede'}\n\nPor favor envíanos el comprobante una vez realizado. Agradecemos tu atención a este importante mensaje.`;
      }

      mensajesEncolados.push({
        club_id: jugador.club_id,
        telefono_destino: cleanedNumber,
        mensaje: mensaje,
        estado: 'Pendiente',
        tipo_mensaje: 'text'
      });
    }

    if (mensajesEncolados.length > 0) {
      // Insertar en lotes de a 100 para no exceder límites
      for (let i = 0; i < mensajesEncolados.length; i += 100) {
        const batch = mensajesEncolados.slice(i, i + 100);
        await supabaseAdmin.from('mensajes_cola').insert(batch);
      }
    }

    return NextResponse.json({ 
      success: true, 
      procesados: mensajesEncolados.length,
      mensaje: `Se encolaron ${mensajesEncolados.length} recordatorios para el día ${day}.`
    });

  } catch (error: any) {
    console.error('Error en cron de recordatorios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
