import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET: Diagnóstico – ver qué hay guardado en configuracion_superadmin
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      raw: data,
      mensaje_cobro_parsed: (() => {
        try { return data?.mensaje_cobro ? JSON.parse(data.mensaje_cobro) : null; } 
        catch (e) { return `PARSE_ERROR: ${data?.mensaje_cobro}`; }
      })()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Guardar configuración usando SOLO mensaje_cobro como fuente canónica
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Leer la config actual para no perder valores existentes
    const { data: configActual, error: readError } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('id, mensaje_cobro, telefono_soporte, gemini_api_key, slack_webhook_url')
      .eq('id', 1)
      .maybeSingle();

    if (readError) {
      console.error('Error leyendo configuracion_superadmin:', readError.message);
    }

    // 2. Reconstruir medios de pago: partir del JSON guardado + sobrescribir con body
    let datosMediosPago: any = {};
    if (configActual?.mensaje_cobro) {
      try {
        datosMediosPago = JSON.parse(configActual.mensaje_cobro);
      } catch (e) {
        console.warn('mensaje_cobro no es JSON válido, se reemplazará:', configActual.mensaje_cobro);
        datosMediosPago = {};
      }
    }

    // Los nuevos valores del body siempre sobrescriben los existentes
    for (const campo of ['saas_nequi', 'saas_daviplata', 'saas_bre_b', 'saas_bancolombia']) {
      if (body[campo] !== undefined) {
        datosMediosPago[campo] = body[campo];
      }
    }

    // 3. Construir payload SOLO con columnas que seguro existen en el esquema base
    const payload: any = {
      id: 1,
      mensaje_cobro: JSON.stringify(datosMediosPago),
    };

    // Campos simples no-medios-de-pago (también columnas seguras)
    if (body.telefono_soporte !== undefined) payload.telefono_soporte = body.telefono_soporte;
    if (body.gemini_api_key !== undefined) payload.gemini_api_key = body.gemini_api_key;
    if (body.slack_webhook_url !== undefined) payload.slack_webhook_url = body.slack_webhook_url;

    console.log('Guardando en configuracion_superadmin:', JSON.stringify(payload));

    // 4. Upsert SOLO con columnas base (sin saas_* sueltas para evitar errores de esquema)
    const { error: upsertError } = await supabaseAdmin
      .from('configuracion_superadmin')
      .upsert(payload, { onConflict: 'id' });

    if (upsertError) {
      console.error('Error en upsert configuracion_superadmin:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // 5. Verificar que quedó guardado
    const { data: verificacion } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('mensaje_cobro')
      .eq('id', 1)
      .maybeSingle();

    console.log('Verificación post-guardado:', verificacion?.mensaje_cobro);

    return NextResponse.json({ 
      success: true, 
      guardado: datosMediosPago,
      verificacion: (() => {
        try { return verificacion?.mensaje_cobro ? JSON.parse(verificacion.mensaje_cobro) : null; }
        catch (e) { return null; }
      })()
    });
  } catch (error: any) {
    console.error('Excepción en API de configuracion:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
