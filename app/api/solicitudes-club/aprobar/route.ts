import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { solicitudId, defaultPassword } = await request.json();

    if (!solicitudId) {
      return NextResponse.json({ error: 'ID de solicitud requerido' }, { status: 400 });
    }

    // 1. Obtener la solicitud
    const { data: solicitud, error: solError } = await supabaseAdmin
      .from('solicitudes_club')
      .select('*')
      .eq('id', solicitudId)
      .single();

    if (solError || !solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    if (solicitud.estado === 'Aprobado') {
      return NextResponse.json({ error: 'Esta solicitud ya ha sido aprobada previamente' }, { status: 400 });
    }

    // 2. Obtener el plan SaaS por defecto
    const { data: planes, error: planError } = await supabaseAdmin
      .from('planes_saas')
      .select('id, dias_prueba')
      .order('created_at', { ascending: true })
      .limit(1);

    if (planError || !planes || planes.length === 0) {
      return NextResponse.json({ error: 'No existe ningún plan SaaS configurado en el sistema.' }, { status: 400 });
    }
    const planId = planes[0].id;
    const diasPrueba = planes[0].dias_prueba || 14;

    // Calcular fecha de fin de prueba
    const fechaFinPrueba = new Date();
    fechaFinPrueba.setDate(fechaFinPrueba.getDate() + diasPrueba);

    // 3. Buscar Embajador si hay código de referido
    let embajador_id = null;
    if (solicitud.codigo_referido) {
      const { data: emb } = await supabaseAdmin
        .from('embajadores')
        .select('id')
        .eq('codigo_referido', solicitud.codigo_referido.toUpperCase())
        .single();
      if (emb) {
        embajador_id = emb.id;
      }
    }

    // Generar un slug único basado en el nombre
    let baseSlug = solicitud.nombre_academia.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    let finalSlug = baseSlug;
    let counter = 1;
    while (true) {
      const { data: existingSlug } = await supabaseAdmin.from('clubes').select('id').eq('slug', finalSlug).maybeSingle();
      if (!existingSlug) break;
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 4. Crear el Club
    const { data: clubResult, error: clubError } = await supabaseAdmin
      .from('clubes')
      .insert([{
        nombre: solicitud.nombre_academia,
        slug: finalSlug,
        ciudad: solicitud.ciudad,
        pais: solicitud.pais,
        logo_url: solicitud.logo_url,
        estado: 'Activo',
        plan: 'Premium',
        plan_id: planId,
        fecha_fin_prueba: fechaFinPrueba.toISOString(),
        embajador_id: embajador_id,
        color_primario: '#84cc16'
      }])
      .select();

    if (clubError) throw clubError;
    const nuevoClub = clubResult[0];

    try {
      // 5. Crear el Usuario / Dueño en Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: solicitud.email,
        password: defaultPassword || 'Master2026*',
        email_confirm: true
      });

      if (authError) {
        throw new Error(`Error en Auth (Quizás el correo ya está registrado): ${authError.message}`);
      }

      // 6. Crear el Perfil "Director"
      const { error: perfilError } = await supabaseAdmin
        .from('perfiles')
        .insert([{
          id: authUser.user.id,
          nombres: solicitud.nombre_director.split(' ')[0] || 'Director',
          apellidos: solicitud.nombre_director.split(' ').slice(1).join(' ') || solicitud.nombre_academia,
          rol: 'Director',
          club_id: nuevoClub.id,
          estado_miembro: 'Activo'
        }]);

      if (perfilError) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        throw new Error(`Error en Perfil: ${perfilError.message}`);
      }

      // 7. KIT DE BIENVENIDA: Configuración WA y Planes
      await supabaseAdmin.from('configuracion_wa').insert([{
        club_id: nuevoClub.id,
        nombre_club: solicitud.nombre_academia,
        temporada_actual: `TEMPORADA ${new Date().getFullYear()}`,
        direccion: 'Sede Central',
        ciudad: solicitud.ciudad || 'Ciudad',
        api_url: 'https://evolution-api-production-c6137.up.railway.app'
      }]);

      await supabaseAdmin.from('planes').insert([{
        club_id: nuevoClub.id,
        nombre: 'Mensualidad Regular',
        precio_base: 70000,
        dia_cobro_mensual: 1,
        dias_limite_pronto_pago: 5,
        descuento_pronto_pago: 10000
      }]);

      // 8. Marcar solicitud como Aprobada
      await supabaseAdmin
        .from('solicitudes_club')
        .update({ estado: 'Aprobado', updated_at: new Date().toISOString() })
        .eq('id', solicitudId);

      // 9. Actualizar estado del referido en clubes (para el embajador)
      if (embajador_id) {
        await supabaseAdmin
           .from('clubes')
           .update({ estado_referido: 'Cliente Activo' })
           .eq('id', nuevoClub.id);
      }

      return NextResponse.json({ success: true, club: nuevoClub });

    } catch (innerError: any) {
      // Rollback del club si falla la creación del usuario
      await supabaseAdmin.from('clubes').delete().eq('id', nuevoClub.id);
      throw innerError;
    }

  } catch (err: any) {
    console.error('Error aprobando solicitud:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
