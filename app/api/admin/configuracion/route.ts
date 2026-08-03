import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET: Diagnóstico – ver qué hay guardado en configuracion_superadmin
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('id, telefono_soporte, mensaje_cobro')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let parsed: any = null;
    try {
      parsed = data?.mensaje_cobro ? JSON.parse(data.mensaje_cobro) : null;
    } catch (e) {
      parsed = `PARSE_ERROR: ${data?.mensaje_cobro}`;
    }

    return NextResponse.json({ raw: data, medios_de_pago: parsed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Guardar configuración
// La tabla configuracion_superadmin solo tiene: id (SERIAL), telefono_soporte, mensaje_cobro
// Los medios de pago SaaS se almacenan SIEMPRE como JSON dentro de mensaje_cobro.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[configuracion] body recibido:', JSON.stringify(body));

    // 1. Leer solo las columnas que REALMENTE existen en la tabla
    const { data: configActual, error: readError } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('id, mensaje_cobro, telefono_soporte')
      .eq('id', 1)
      .maybeSingle();

    if (readError) {
      console.warn('[configuracion] Error leyendo config actual:', readError.message);
    }

    console.log('[configuracion] config actual en DB:', JSON.stringify(configActual));

    // 2. Reconstruir medios de pago desde mensaje_cobro + nuevos valores del body
    let datosMediosPago: any = {};
    if (configActual?.mensaje_cobro) {
      try {
        datosMediosPago = JSON.parse(configActual.mensaje_cobro);
        console.log('[configuracion] datosMediosPago actuales:', JSON.stringify(datosMediosPago));
      } catch (e) {
        console.warn('[configuracion] mensaje_cobro no es JSON válido:', configActual.mensaje_cobro);
      }
    }

    // Los nuevos valores del body siempre sobrescriben, pero IGNORAR campos vacíos
    const camposMediosPago = ['saas_nequi', 'saas_daviplata', 'saas_bre_b', 'saas_bancolombia'];
    for (const campo of camposMediosPago) {
      if (body[campo] !== undefined && body[campo] !== '') {
        datosMediosPago[campo] = body[campo];
      }
    }

    console.log('[configuracion] datosMediosPago después del merge:', JSON.stringify(datosMediosPago));

    // 3. Payload SOLO con columnas que existen: id, mensaje_cobro, telefono_soporte
    const payload: any = {
      id: 1,
      mensaje_cobro: JSON.stringify(datosMediosPago),
    };

    if (body.telefono_soporte !== undefined) {
      payload.telefono_soporte = body.telefono_soporte;
    }

    console.log('[configuracion] payload a guardar:', JSON.stringify(payload));

    // 4. UPDATE primero (más confiable que upsert cuando la fila ya existe)
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('configuracion_superadmin')
      .update({ mensaje_cobro: payload.mensaje_cobro, ...(payload.telefono_soporte ? { telefono_soporte: payload.telefono_soporte } : {}) })
      .eq('id', 1)
      .select('id, mensaje_cobro');

    if (updateError) {
      console.error('[configuracion] Error en UPDATE:', updateError.message);
      // Si el update falla, intentar INSERT
      const { error: insertError } = await supabaseAdmin
        .from('configuracion_superadmin')
        .insert({ id: 1, mensaje_cobro: payload.mensaje_cobro, telefono_soporte: payload.telefono_soporte || '+573124265170' });

      if (insertError) {
        console.error('[configuracion] Error en INSERT fallback:', insertError.message);
        return NextResponse.json({ error: `UPDATE: ${updateError.message} | INSERT: ${insertError.message}` }, { status: 500 });
      }
    }

    console.log('[configuracion] resultado UPDATE:', JSON.stringify(updated));

    // 5. Verificar que quedó guardado
    const { data: verificacion } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('id, mensaje_cobro')
      .eq('id', 1)
      .maybeSingle();

    console.log('[configuracion] verificación post-guardado:', JSON.stringify(verificacion));

    return NextResponse.json({
      success: true,
      guardado: datosMediosPago,
      verificacion_db: (() => {
        try { return verificacion?.mensaje_cobro ? JSON.parse(verificacion.mensaje_cobro) : null; }
        catch (e) { return verificacion?.mensaje_cobro; }
      })()
    });
  } catch (error: any) {
    console.error('[configuracion] Excepción:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
