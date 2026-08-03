import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Leer la config actual para no perder valores existentes
    const { data: configActual } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    // 2. Construir el estado actual de los medios de pago
    //    Prioridad: columna directa (si existe y tiene valor) > mensaje_cobro JSON > vacío
    let datosMediosPago: any = {};

    // a) Cargar desde mensaje_cobro como base
    if (configActual?.mensaje_cobro) {
      try {
        datosMediosPago = JSON.parse(configActual.mensaje_cobro);
      } catch (e) {}
    }

    // b) Si hay columnas directas con valor, sobrescriben el JSON
    const camposMediosPago = ['saas_nequi', 'saas_daviplata', 'saas_bre_b', 'saas_bancolombia'];
    for (const campo of camposMediosPago) {
      if (configActual?.[campo]) datosMediosPago[campo] = configActual[campo];
    }

    // c) Los nuevos valores del body siempre ganan (el usuario acaba de editarlos)
    for (const campo of camposMediosPago) {
      if (body[campo] !== undefined) {
        datosMediosPago[campo] = body[campo];
      }
    }

    // 3. Payload principal: siempre guarda mensaje_cobro como fuente canónica de medios de pago
    const payload: any = {
      id: 1,
      mensaje_cobro: JSON.stringify(datosMediosPago),
    };

    // Campos simples del body (no son medios de pago)
    if (body.telefono_soporte !== undefined) payload.telefono_soporte = body.telefono_soporte;
    if (body.gemini_api_key !== undefined) payload.gemini_api_key = body.gemini_api_key;
    if (body.slack_webhook_url !== undefined) payload.slack_webhook_url = body.slack_webhook_url;

    // Intentar también guardar columnas directas si están en el esquema
    for (const campo of camposMediosPago) {
      payload[campo] = datosMediosPago[campo] ?? '';
    }

    // 4. Upsert. Si falla por columnas inexistentes, reintentar sin ellas
    let { error } = await supabaseAdmin
      .from('configuracion_superadmin')
      .upsert(payload);

    if (error) {
      console.warn('Upsert con columnas saas_* falló, reintentando sin ellas:', error.message);

      const payloadReducido: any = { id: 1, mensaje_cobro: payload.mensaje_cobro };
      if (payload.telefono_soporte !== undefined) payloadReducido.telefono_soporte = payload.telefono_soporte;
      if (payload.gemini_api_key !== undefined) payloadReducido.gemini_api_key = payload.gemini_api_key;
      if (payload.slack_webhook_url !== undefined) payloadReducido.slack_webhook_url = payload.slack_webhook_url;

      const { error: fallbackError } = await supabaseAdmin
        .from('configuracion_superadmin')
        .upsert(payloadReducido);

      if (fallbackError) {
        console.error('Error final guardando configuración:', fallbackError);
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Excepción en API de configuracion:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
