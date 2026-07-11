import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { logAction } from '@/lib/audit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  context: any
) {
  const { id } = await context.params;

  try {
    // 1. Datos básicos del club
    const { data: club } = await supabaseAdmin
      .from('clubes')
      .select('*')
      .eq('id', id)
      .single();

    if (!club) return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 });

    // 2. Conteo de Entrenadores
    const { count: coaches } = await supabaseAdmin
      .from('perfiles')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', id)
      .eq('rol', 'Entrenador');

    // 3. Conteo de Categorías
    const { count: categorias } = await supabaseAdmin
      .from('categorias')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', id);

    // 4. Últimos 5 pagos registrados (con JOIN a perfiles para obtener nombres)
    const { data: ultimosPagos } = await supabaseAdmin
      .from('pagos_ingresos')
      .select(`
        *,
        perfiles:jugador_id (
          nombres,
          apellidos
        )
      `)
      .eq('club_id', id)
      .order('fecha', { ascending: false })
      .limit(10);

    // Mapear para que el frontend reciba 'jugador_nombre'
    const actividadMapeada = ultimosPagos?.map(pago => ({
      ...pago,
      jugador_nombre: pago.perfiles ? `${pago.perfiles.nombres} ${pago.perfiles.apellidos}` : 'Alumno Sin Perfil'
    }));

    return NextResponse.json({
      club,
      stats: {
        coaches: coaches || 0,
        categorias: categorias || 0
      },
      actividad: actividadMapeada || []
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: any
) {
  const { id } = await context.params;

  try {
    // 1. Obtener datos antes del cambio
    const { data: club } = await supabaseAdmin.from('clubes').select('nombre').eq('id', id).single();
    const { data: { user } } = await supabaseAdmin.auth.getUser();

    // 2. Realizar SOFT DELETE (Baja Lógica)
    // Cambiamos el estado y marcamos la fecha de eliminación
    const { error } = await supabaseAdmin
      .from('clubes')
      .update({ 
        estado: 'Eliminado',
        deleted_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) throw error;

    // 3. Registrar en Auditoría
    if (user) {
      await logAction({
        userId: user.id,
        clubId: id,
        accion: 'SOFT_DELETE_CLUB',
        descripcion: `Se dio de baja lógica al club: ${club?.nombre || id}. Sus datos permanecen en archivo.`,
        metadata: { club_id: id, nombre: club?.nombre }
      });
    }

    return NextResponse.json({ success: true, message: 'Club dado de baja correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: any
) {
  const { id } = await context.params;
  try {
    const { 
      nombre, 
      correo_administrativo, 
      telefono_contacto, 
      direccion, 
      nombre_legal,
      sync_director_email,
      director_id,
      fecha_fin_prueba,
      tarifa_por_jugador,
      plan_id,
      proximo_corte
    } = await request.json();

    // 1. Actualizar datos del club
      const updatePayload: any = {
        updated_at: new Date().toISOString()
      };
      if (nombre !== undefined) updatePayload.nombre = nombre;
      if (correo_administrativo !== undefined) updatePayload.correo_administrativo = correo_administrativo;
      if (telefono_contacto !== undefined) updatePayload.telefono_contacto = telefono_contacto;
      if (direccion !== undefined) updatePayload.direccion = direccion;
      if (nombre_legal !== undefined) updatePayload.nombre_legal = nombre_legal;
      if (tarifa_por_jugador !== undefined) updatePayload.tarifa_por_jugador = tarifa_por_jugador;
      if (proximo_corte !== undefined) updatePayload.proximo_corte = proximo_corte;
      
      if (fecha_fin_prueba !== undefined) {
        updatePayload.fecha_fin_prueba = fecha_fin_prueba ? new Date(fecha_fin_prueba).toISOString() : null;
      }
      if (plan_id !== undefined) {
        updatePayload.plan_id = plan_id || null;
      }

      const { error: updateError } = await supabaseAdmin
        .from('clubes')
        .update(updatePayload)
        .eq('id', id);

    if (updateError) throw updateError;

    if (sync_director_email && correo_administrativo) {
      // Buscar el ID del director si no viene (es el perfil con rol Director vinculado a este club)
      let targetUserId = director_id;
      if (!targetUserId) {
        const { data: directorPerfil } = await supabaseAdmin
          .from('perfiles')
          .select('id')
          .eq('club_id', id)
          .eq('rol', 'Director')
          .single();
        targetUserId = directorPerfil?.id;
      }

      if (targetUserId) {
        const updateData: any = { email: correo_administrativo };

        
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          targetUserId,
          updateData
        );
        if (authError) console.error("Error syncing director auth:", authError.message);
      }
    }

    // 3. Registrar acción en logs_admin (Audit Trail Maestro)
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (user) {
      await supabaseAdmin.from('logs_admin').insert({
        admin_id: user.id,
        accion: 'EDIT_CLUB',
        entidad_tipo: 'clubes',
        entidad_id: id,
        detalles: { 
          nombre, 
          correo: correo_administrativo, 
          sync_email: sync_director_email 
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("CRITICAL API ERROR [PATCH CLUB]:", error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
