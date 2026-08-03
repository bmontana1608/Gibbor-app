import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Intentar upsert directo con todas las propiedades
    const { error } = await supabaseAdmin
      .from('configuracion_superadmin')
      .upsert({ id: 1, ...body });

    if (error) {
      console.warn('Upsert directo falló (posibles columnas no creadas aún), utilizando fallback en mensaje_cobro:', error.message);

      // 2. Obtener config actual
      const { data: configActual } = await supabaseAdmin
        .from('configuracion_superadmin')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      let datosCobroExistentes: any = {};
      if (configActual?.mensaje_cobro) {
        try {
          datosCobroExistentes = JSON.parse(configActual.mensaje_cobro);
        } catch (e) {}
      }

      const datosCobroNuevos = {
        ...datosCobroExistentes,
        saas_nequi: body.saas_nequi !== undefined ? body.saas_nequi : datosCobroExistentes.saas_nequi,
        saas_daviplata: body.saas_daviplata !== undefined ? body.saas_daviplata : datosCobroExistentes.saas_daviplata,
        saas_bre_b: body.saas_bre_b !== undefined ? body.saas_bre_b : datosCobroExistentes.saas_bre_b,
        saas_bancolombia: body.saas_bancolombia !== undefined ? body.saas_bancolombia : datosCobroExistentes.saas_bancolombia,
      };

      const payloadSeguro: any = { id: 1, mensaje_cobro: JSON.stringify(datosCobroNuevos) };
      if (body.telefono_soporte !== undefined) payloadSeguro.telefono_soporte = body.telefono_soporte;
      if (body.gemini_api_key !== undefined) payloadSeguro.gemini_api_key = body.gemini_api_key;
      if (body.slack_webhook_url !== undefined) payloadSeguro.slack_webhook_url = body.slack_webhook_url;

      const { error: fallbackError } = await supabaseAdmin
        .from('configuracion_superadmin')
        .upsert(payloadSeguro);

      if (fallbackError) {
        console.error('Error final en fallback de configuracion_superadmin:', fallbackError);
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Excepción en API de configuracion:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

