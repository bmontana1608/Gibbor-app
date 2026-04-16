import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { enviarMensajeWhatsApp } from '@/lib/whatsapp';
import { generarReciboPDFBase64 } from '@/lib/recibo-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📩 Webhook recibido:', body);

    // 1. Extraer el mensaje y el remitente (Estructura de Evolution API)
    const message = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || '';
    const remoteJid = body.data?.key?.remoteJid;

    if (!message || !remoteJid) return NextResponse.json({ ok: true });

    const command = message.toLowerCase().split(' ')[0];

    // ----- COMANDO: !AYUDA -----
    if (command === '!ayuda') {
      const menu = `🤖 *ASISTENTE GIBBOR APP* \n\n` +
                   `Puedes usar estos comandos desde aquí:\n\n` +
                   `• *!pago [nombre] [monto]* \nRegistra un pago y genera recibo PDF.\n` +
                   `• *!info [nombre]* \nVer estado, deuda y contacto del alumno.\n` +
                   `• *!asistencia [nombre]* \nMarca asistencia de hoy como *Presente*.\n\n` +
                   `_Ejemplo: !pago Milan 60000_`;
      await enviarMensajeWhatsApp(remoteJid, menu);
      return NextResponse.json({ ok: true });
    }

    // ----- COMANDO: !PAGO -----
    if (command === '!pago') {
      const parts = message.split(' ');
      if (parts.length < 3) {
        await enviarMensajeWhatsApp(remoteJid, '❌ Formato incorrecto. Usa: !pago [Nombre] [Monto]');
        return NextResponse.json({ ok: true });
      }

      const nombreBusqueda = parts[1];
      const monto = parseInt(parts[2].replace(/\D/g, ''));

      const { data: alumnos } = await supabase.from('perfiles').select('*').ilike('nombres', `%${nombreBusqueda}%`).limit(1);
      
      if (!alumnos || alumnos.length === 0) {
        await enviarMensajeWhatsApp(remoteJid, `🔍 No encontré a "${nombreBusqueda}".`);
        return NextResponse.json({ ok: true });
      }

      const alumno = alumnos[0];
      await supabase.from('pagos_ingresos').insert([{
        jugador_id: alumno.id,
        monto_base: monto,
        total: monto,
        metodo_pago: 'Efectivo (Bot)',
        fecha: new Date().toISOString().split('T')[0]
      }]);

      const { data: config } = await supabase.from('configuracion_wa').select('*').single();
      const pdfBase64 = await generarReciboPDFBase64({
        nombres: alumno.nombres, apellidos: alumno.apellidos, documento: alumno.documento,
        grupo: alumno.grupos, tarifa: monto, metodo: 'EFECTIVO',
        consecutivo: 'BOT-' + Math.floor(Math.random() * 9999),
        empresa: {
          direccion: config?.direccion || 'Sede Deportiva', ciudad: config?.ciudad || 'Cúcuta',
          nequi: config?.nequi, daviplata: config?.daviplata,
          banco: config?.banco_nombre ? `${config.banco_nombre}: ${config.banco_numero}` : undefined
        }
      });

      await enviarMensajeWhatsApp(remoteJid, `✅ *PAGO REGISTRADO* \nAlumno: *${alumno.nombres}*\nMonto: *$ ${monto.toLocaleString()}*`, pdfBase64, 'document', `Recibo_${alumno.nombres}.pdf`);
    }

    // ----- COMANDO: !INFO -----
    if (command === '!info') {
      const nombreBusqueda = message.split(' ')[1];
      if (!nombreBusqueda) return NextResponse.json({ ok: true });

      const { data: alumnos } = await supabase.from('perfiles').select('*').ilike('nombres', `%${nombreBusqueda}%`).limit(1);
      if (!alumnos || alumnos.length === 0) {
        await enviarMensajeWhatsApp(remoteJid, `🔍 No encontré a "${nombreBusqueda}".`);
        return NextResponse.json({ ok: true });
      }

      const alumno = alumnos[0];
      const { data: planes } = await supabase.from('planes').select('*');
      const precio = planes?.find(p => p.nombre === (alumno.tipo_plan || 'Regular'))?.precio_base || 140000;
      
      const mesPrefijo = new Date().toISOString().slice(0, 7);
      const { data: pago } = await supabase.from('pagos_ingresos').select('*').eq('jugador_id', alumno.id).filter('fecha', 'gte', `${mesPrefijo}-01`).limit(1);

      const info = `👤 *INFO ALUMNO* \n\n` +
                   `• *Nombre:* ${alumno.nombres} ${alumno.apellidos}\n` +
                   `• *Plan:* ${alumno.tipo_plan || 'Regular'}\n` +
                   `• *Estado Pago:* ${pago && pago.length > 0 ? '✅ AL DÍA' : '❌ PENDIENTE'}\n` +
                   `• *Tel. Acudiente:* ${alumno.telefono || 'No registrado'}\n\n` +
                   `_Para registrar pago usa !pago ${alumno.nombres.split(' ')[0]} ${precio}_`;
      
      await enviarMensajeWhatsApp(remoteJid, info);
    }

    // ----- COMANDO: !ASISTENCIA -----
    if (command === '!asistencia') {
      const nombreBusqueda = message.split(' ')[1];
      if (!nombreBusqueda) return NextResponse.json({ ok: true });

      const { data: alumnos } = await supabase.from('perfiles').select('*').ilike('nombres', `%${nombreBusqueda}%`).limit(1);
      if (!alumnos || alumnos.length === 0) return NextResponse.json({ ok: true });

      const alumno = alumnos[0];
      const { error } = await supabase.from('asistencias').insert([{
        jugador_id: alumno.id,
        estado: 'Presente',
        fecha: new Date().toISOString().split('T')[0]
      }]);

      if (!error) {
        await enviarMensajeWhatsApp(remoteJid, `⚽ *ASISTENCIA REGISTRADA* \n*${alumno.nombres}* ha sido marcado como *Presente* el día de hoy.`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('❌ Error en Webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
