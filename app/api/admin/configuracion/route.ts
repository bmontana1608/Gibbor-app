import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('GET /api/admin/configuracion warning:', error.message);
    }

    // Desglosar respaldo de mensaje_cobro si existe
    let storeJson: any = {};
    if (data?.mensaje_cobro) {
      try {
        const parsed = JSON.parse(data.mensaje_cobro);
        if (parsed && typeof parsed === 'object') {
          storeJson = parsed;
        }
      } catch (_) {}
    }

    const canales = data?.canales_pago || storeJson.canales_pago || {};
    const geminiKeys = data?.gemini_api_keys || storeJson.gemini_api_keys || (data?.gemini_api_key ? [data.gemini_api_key] : (storeJson.gemini_api_key ? [storeJson.gemini_api_key] : []));
    const geminiKey = data?.gemini_api_key || storeJson.gemini_api_key || (geminiKeys[0] || '');
    const telefonoSoporte = data?.telefono_soporte || storeJson.telefono_soporte || '';
    const slackWebhook = data?.slack_webhook_url || storeJson.slack_webhook_url || '';

    return NextResponse.json(
      { 
        data: {
          ...(data || {}),
          ...storeJson,
          telefono_soporte: telefonoSoporte,
          slack_webhook_url: slackWebhook,
          gemini_api_keys: geminiKeys,
          gemini_api_key: geminiKey,
          canales_pago: canales
        } 
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Intentar autoejecutar la creación de la columna 'canales_pago' si hay funciones RPC disponibles
    try {
      await supabaseAdmin.rpc('execute_sql', {
        sql: `ALTER TABLE configuracion_superadmin ADD COLUMN IF NOT EXISTS canales_pago JSONB DEFAULT '{}'::jsonb;`
      });
    } catch (_) {
      try {
        await supabaseAdmin.rpc('query_sql', {
          sql: `ALTER TABLE configuracion_superadmin ADD COLUMN IF NOT EXISTS canales_pago JSONB DEFAULT '{}'::jsonb;`
        });
      } catch (_) {}
    }

    // 2. Obtener la fila existente
    const { data: existing } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    // 3. Extraer almacén JSON de respaldo en mensaje_cobro
    let storeJson: any = {};
    if (existing?.mensaje_cobro) {
      try {
        const parsed = JSON.parse(existing.mensaje_cobro);
        if (parsed && typeof parsed === 'object') storeJson = parsed;
      } catch (_) {}
    }

    // Actualizar el almacén JSON con todos los datos recibidos
    const updatedStore = {
      ...storeJson,
      ...body,
      updated_at: new Date().toISOString()
    };
    if (body.canales_pago) {
      updatedStore.canales_pago = body.canales_pago;
    }

    // Preparar el payload completo con respaldo en mensaje_cobro
    const payloadCompleto: any = { 
      ...body,
      mensaje_cobro: JSON.stringify(updatedStore)
    };

    let error: any = null;

    if (existing?.id) {
      const resUpdate = await supabaseAdmin
        .from('configuracion_superadmin')
        .update(payloadCompleto)
        .eq('id', existing.id);
      error = resUpdate.error;
    } else {
      const resInsert = await supabaseAdmin
        .from('configuracion_superadmin')
        .insert({ ...payloadCompleto, id: 1 });
      error = resInsert.error;
    }

    // Si Postgres falla por alguna columna que no existe en el esquema físico:
    if (error && (error.code === 'PGRST204' || error.message?.toLowerCase().includes('column'))) {
      console.warn('[configuracion] Error de columna física en PostgreSQL, guardando sólo columnas base y respaldo JSON:', error.message);
      
      // Guardar únicamente en mensaje_cobro y columnas básicas garantizadas
      const payloadFallback: any = {
        mensaje_cobro: JSON.stringify(updatedStore)
      };
      if (body.telefono_soporte) payloadFallback.telefono_soporte = body.telefono_soporte;

      if (existing?.id) {
        const resFallback = await supabaseAdmin
          .from('configuracion_superadmin')
          .update(payloadFallback)
          .eq('id', existing.id);
        error = resFallback.error;
      } else {
        const resFallback = await supabaseAdmin
          .from('configuracion_superadmin')
          .insert({ ...payloadFallback, id: 1 });
        error = resFallback.error;
      }
    }

    if (error) {
      console.error('Error guardando configuración:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedStore,
      canales_pago: updatedStore.canales_pago 
    });
  } catch (error: any) {
    console.error('Error en POST /api/admin/configuracion:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
