import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
    if (perfil?.rol !== 'SuperAdmin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { club_id, embajador_id, estado_referido } = await request.json();

    if (!club_id) {
      return NextResponse.json({ error: 'club_id es requerido' }, { status: 400 });
    }

    const valEmbajador = !embajador_id || embajador_id === 'none' ? null : embajador_id;
    const finalEstadoRef = valEmbajador ? (estado_referido || 'Cliente Activo') : null;

    const updatePayload: any = {
      embajador_id: valEmbajador,
      estado_referido: finalEstadoRef,
      updated_at: new Date().toISOString()
    };

    if (valEmbajador) {
      updatePayload.fuente_referido = 'manual';
      if (finalEstadoRef === 'Cliente Activo') {
        updatePayload.fecha_activacion = new Date().toISOString();
      }
    } else {
      updatePayload.fuente_referido = null;
      updatePayload.fecha_activacion = null;
    }

    // Obtener datos del club antes de actualizar
    const { data: club, error: clubFetchError } = await supabaseAdmin
      .from('clubes')
      .select('id, nombre')
      .eq('id', club_id)
      .single();

    if (clubFetchError || !club) {
      return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('clubes')
      .update(updatePayload)
      .eq('id', club_id);

    if (updateError) throw updateError;

    // Si se asignó un embajador, crear notificación para su panel
    if (valEmbajador) {
      try {
        await supabaseAdmin.from('notificaciones_embajadores').insert({
          embajador_id: valEmbajador,
          tipo: 'NUEVO_CLUB',
          mensaje: `Se te ha asignado el club "${club.nombre}" como referido comercial (${finalEstadoRef}).`
        });
      } catch (notifErr) {
        console.warn('No se pudo enviar notificación al embajador:', notifErr);
      }
    }

    // Registrar en logs_admin si existe la tabla
    try {
      await supabaseAdmin.from('logs_admin').insert({
        admin_id: user.id,
        accion: 'ASSIGN_EMBAJADOR_CLUB',
        entidad_tipo: 'clubes',
        entidad_id: club_id,
        detalles: {
          embajador_id: valEmbajador,
          estado_referido: finalEstadoRef,
          club_nombre: club.nombre
        }
      });
    } catch {
      // Ignorar si la tabla logs no está disponible
    }

    return NextResponse.json({
      success: true,
      club_id,
      embajador_id: valEmbajador,
      estado_referido: finalEstadoRef
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
