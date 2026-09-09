import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

    let canales = data?.canales_pago;
    if (!canales && data?.mensaje_cobro) {
      try {
        const parsed = JSON.parse(data.mensaje_cobro);
        if (parsed && typeof parsed === 'object') {
          canales = parsed.canales_pago || parsed;
        }
      } catch (_) {}
    }

    return NextResponse.json({ 
      data: {
        ...(data || {}),
        canales_pago: canales || data?.canales_pago || {}
      } 
    });
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

    // 2. Obtener la fila existente sin requerir selectivamente 'canales_pago' (para que no rompa si no existe la columna)
    const { data: existing } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    const targetId = existing?.id || 1;

    let mergedCanales = body.canales_pago;
    if (mergedCanales && typeof mergedCanales === 'object') {
      let oldCanales = existing?.canales_pago;
      if (!oldCanales && existing?.mensaje_cobro) {
        try {
          const parsed = JSON.parse(existing.mensaje_cobro);
          if (parsed && typeof parsed === 'object') {
            oldCanales = parsed.canales_pago || parsed;
          }
        } catch (_) {}
      }
      if (oldCanales && typeof oldCanales === 'object') {
        mergedCanales = { ...oldCanales, ...mergedCanales };
      }
    }

    // Preparar payload con canales_pago y también en mensaje_cobro como respaldo infalible
    const payloadCompleto: any = { ...body, id: targetId };
    if (mergedCanales) {
      payloadCompleto.canales_pago = mergedCanales;
      // Siempre guardamos una copia en mensaje_cobro (que es columna TEXT que existe desde siempre)
      payloadCompleto.mensaje_cobro = JSON.stringify({ canales_pago: mergedCanales });
    }

    // Intentar upsert con canales_pago
    let { error } = await supabaseAdmin
      .from('configuracion_superadmin')
      .upsert(payloadCompleto);

    // Si Postgres indica que la columna 'canales_pago' no existe en la tabla física
    if (error && (error.message.includes('canales_pago') || error.code === 'PGRST204' || error.message.toLowerCase().includes('column'))) {
      console.warn('[configuracion] Columna canales_pago no existe en PostgreSQL, guardando mediante fallback mensaje_cobro.');
      
      const payloadFallback: any = { ...payloadCompleto };
      delete payloadFallback.canales_pago;

      const resFallback = await supabaseAdmin
        .from('configuracion_superadmin')
        .upsert(payloadFallback);

      error = resFallback.error;
    }

    if (error) {
      console.error('Error guardando configuración:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en POST /api/admin/configuracion:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
