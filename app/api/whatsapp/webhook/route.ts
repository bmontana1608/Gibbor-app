import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { enviarMensajeWhatsApp } from '@/lib/whatsapp';
import { generarReciboPDFBase64 } from '@/lib/recibo-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📩 Webhook recibido:', body);

    // 1. Extraer el mensaje y el remitente (Estructura de Evolution API)
    const message = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || '';
    const remoteJid = body.data?.key?.remoteJid;

    if (!message || !remoteJid) return NextResponse.json({ ok: true });

    // 2. Detectar comando !pago
    if (message.toLowerCase().startsWith('!pago')) {
      const parts = message.split(' ');
      if (parts.length < 3) {
        await enviarMensajeWhatsApp(remoteJid, '❌ Formato incorrecto. Usa: !pago [Nombre] [Monto]\nEjemplo: !pago Daniel 60000');
        return NextResponse.json({ ok: true });
      }

      const nombreBusqueda = parts[1];
      const monto = parseInt(parts[2].replace(/\D/g, ''));

      // 3. Buscar al alumno en Gibbor App
      const { data: alumnos, error: errorBusq } = await supabase
        .from('perfiles')
        .select('*')
        .ilike('nombres', `%${nombreBusqueda}%`)
        .limit(1);

      if (errorBusq || !alumnos || alumnos.length === 0) {
        await enviarMensajeWhatsApp(remoteJid, `🔍 No encontré ningún alumno llamado "${nombreBusqueda}". Revisa el nombre.`);
        return NextResponse.json({ ok: true });
      }

      const alumno = alumnos[0];

      // 4. Registrar el pago en la base de datos
      const { error: errorPago } = await supabase
        .from('pagos_ingresos')
        .insert([{
          jugador_id: alumno.id,
          monto_base: monto,
          total: monto,
          metodo_pago: 'Efectivo (Bot)',
          fecha: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        }]);

      if (errorPago) throw errorPago;

      // 5. Cargar configuración de la empresa para el recibo
      const { data: config } = await supabase.from('configuracion_wa').select('*').single();

      // 6. Generar el PDF profesional
      const pdfBase64 = await generarReciboPDFBase64({
        nombres: alumno.nombres,
        apellidos: alumno.apellidos,
        documento: alumno.documento,
        grupo: alumno.grupos,
        tarifa: monto,
        metodo: 'EFECTIVO',
        consecutivo: 'BOT-' + Math.floor(Math.random() * 9999),
        empresa: {
          direccion: config?.direccion || 'Sede Deportiva',
          ciudad: config?.ciudad || 'Cúcuta',
          nequi: config?.nequi,
          daviplata: config?.daviplata,
          banco: config?.banco_nombre ? `${config.banco_nombre}: ${config.banco_numero}` : undefined
        }
      });

      // 7. Enviar confirmación con el PDF
      await enviarMensajeWhatsApp(
        remoteJid, 
        `✅ *PAGO REGISTRADO EXITOSAMENTE* \n\nAlumno: *${alumno.nombres} ${alumno.apellidos}*\nMonto: *$ ${monto.toLocaleString()}*\n\nAquí tienes el recibo oficial generado.`,
        pdfBase64,
        'document',
        `Recibo_${alumno.nombres}_Bot.pdf`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('❌ Error en Webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
