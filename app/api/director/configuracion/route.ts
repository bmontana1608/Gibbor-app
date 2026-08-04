import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { club_id, config, identidad } = body;

    if (!club_id) {
      return NextResponse.json({ error: 'Falta el ID del club' }, { status: 400 });
    }

    // 1. Actualizar identidad visual en la tabla `clubes`
    if (identidad || config?.nombre_club) {
      const payloadClub: any = {};
      if (config?.nombre_club) payloadClub.nombre = config.nombre_club;
      if (identidad?.logo_url !== undefined) payloadClub.logo_url = identidad.logo_url;
      if (identidad?.color_primario) payloadClub.color_primario = identidad.color_primario;
      if (identidad?.color_secundario) payloadClub.color_secundario = identidad.color_secundario;

      if (Object.keys(payloadClub).length > 0) {
        const { error: errClub } = await supabaseAdmin
          .from('clubes')
          .update(payloadClub)
          .eq('id', club_id);

        if (errClub) {
          console.error('[api/director/configuracion] Error actualizando club:', errClub.message);
        }
      }
    }

    // 2. Guardar en `configuracion_wa`
    if (config) {
      const { data: existing } = await supabaseAdmin
        .from('configuracion_wa')
        .select('id')
        .eq('club_id', club_id)
        .maybeSingle();

      const payloadWa: any = {
        club_id,
        direccion: config.direccion ?? '',
        ciudad: config.ciudad ?? '',
        nequi: config.nequi ?? '',
        daviplata: config.daviplata ?? '',
        bre_b: config.bre_b ?? '',
        banco_nombre: config.banco_nombre ?? '',
        banco_numero: config.banco_numero ?? '',
        link_pago: config.link_pago ?? '',
        hijos_config: config.hijos_config ?? '',
        temporada_actual: config.temporada_actual ?? '',
        nombre_club: config.nombre_club ?? '',
        updated_at: new Date().toISOString()
      };

      if (existing?.id) {
        payloadWa.id = existing.id;
      }

      // Intentar upsert con todos los campos
      let { error: errWa } = await supabaseAdmin.from('configuracion_wa').upsert(payloadWa);

      // Si falla por una columna no existente en Supabase (ej: hijos_config o temporada_actual),
      // reintentar sin las columnas no críticas
      if (errWa) {
        console.warn('[api/director/configuracion] Primer intento upsert fallo, reintentando:', errWa.message);
        delete payloadWa.nombre_club;
        delete payloadWa.temporada_actual;
        delete payloadWa.hijos_config;

        const { error: errRetry } = await supabaseAdmin.from('configuracion_wa').upsert(payloadWa);
        if (errRetry) {
          throw new Error('Error al guardar configuración de WhatsApp/Pagos: ' + errRetry.message);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Configuración guardada correctamente' });
  } catch (error: any) {
    console.error('[api/director/configuracion] Excepción:', error);
    return NextResponse.json({ error: error.message || 'Error al guardar configuración' }, { status: 500 });
  }
}
