import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, password, perfilId, rol } = await request.json();

    if (!email || !password || !perfilId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // 1. Autenticar al usuario llamante
    const supabase = await createClient();
    const { data: { user: caller } } = await supabase.auth.getUser();
    if (!caller) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Obtener el perfil del llamante para verificar rol y club_id
    const { data: callerPerfil } = await supabase
      .from('perfiles')
      .select('rol, club_id')
      .eq('id', caller.id)
      .single();

    if (!callerPerfil) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const isSuperAdmin = callerPerfil.rol === 'SuperAdmin';
    const isDirector = callerPerfil.rol === 'Director';

    if (!isSuperAdmin && !isDirector) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 3. Obtener los datos actuales del perfil original antes de crear el acceso
    const { data: perfilOriginal, error: getError } = await supabaseAdmin
      .from('perfiles')
      .select('*')
      .eq('id', perfilId)
      .single();

    if (getError || !perfilOriginal) {
       return NextResponse.json({ error: 'No se encontró el perfil original' }, { status: 404 });
    }

    // 4. Aislamiento Multi-tenant: Si es Director, validar que el perfil original pertenezca a su mismo club
    if (isDirector && perfilOriginal.club_id !== callerPerfil.club_id) {
      return NextResponse.json({ error: 'No autorizado (diferente club)' }, { status: 403 });
    }

    // 5. Intentar crear el usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { rol }
    });

    if (authError) {
      // SI EL USUARIO YA EXISTE (CASO DE HERMANOS/FAMILIA)
      if (authError.message.includes('already been registered') || authError.status === 422) {
        // No creamos usuario nuevo, solo activamos el perfil y lo vinculamos por email_contacto
        const { error: activateError } = await supabaseAdmin
          .from('perfiles')
          .update({ 
            estado_miembro: 'Activo',
            email_contacto: email 
          })
          .eq('id', perfilId);

        if (activateError) {
          return NextResponse.json({ error: 'Error al activar perfil familiar: ' + activateError.message }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Perfil vinculado a cuenta familiar existente',
          isFamilyLink: true 
        });
      }

      console.error('Error Auth:', authError.message);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // 6. MIGRACIÓN SEGURA (Copiar -> Migrar -> Eliminar)

    // 2.2 Crear el NUEVO perfil (Clon con nuevo ID)
    const { error: createError } = await supabaseAdmin
      .from('perfiles')
      .insert([{
        ...perfilOriginal,
        id: authUser.user.id,
        email_contacto: email
      }]);

    if (createError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: 'Error al clonar perfil: ' + createError.message }, { status: 500 });
    }

    // 2.3 Migrar dependencias al nuevo ID
    const tablasDependientes = ['pagos_ingresos', 'asistencias', 'evaluaciones_tecnicas'];
    for (const tabla of tablasDependientes) {
      await supabaseAdmin
        .from(tabla)
        .update({ jugador_id: authUser.user.id })
        .eq('jugador_id', perfilId);
    }

    // 2.4 Eliminar el perfil antiguo (El temporal)
    await supabaseAdmin.from('perfiles').delete().eq('id', perfilId);

    // ==========================================
    // 3. MENSAJE DE BIENVENIDA (WHATSAPP)
    // ==========================================
    try {
      // 3.1 Buscar el club al que pertenece el nuevo usuario
      const { data: rel } = await supabaseAdmin
        .from('clubes_usuarios')
        .select('club_id')
        .eq('usuario_id', authUser.user.id)
        .limit(1)
        .single();

      if (rel && rel.club_id) {
        // 3.2 Buscar el club y su configuracion WA
        const { data: clubInfo } = await supabaseAdmin
          .from('clubes')
          .select('slug, nombre')
          .eq('id', rel.club_id)
          .single();

        const { data: waConfig } = await supabaseAdmin
          .from('configuracion_wa')
          .select('active_webhook')
          .eq('club_id', rel.club_id)
          .single();

        // Asumimos bienvenida activa si tienen WA configurado (hasta que se agregue la columna booleana real)
        const bienvenidaActiva = waConfig?.active_webhook === true;

        if (clubInfo && bienvenidaActiva && perfilOriginal?.telefono) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portalgibbor.com';
          const clubLoginUrl = `${appUrl}/${clubInfo.slug}/login`;
          
          const mensajeBienvenida = `¡Hola ${perfilOriginal.nombres}! 👋⚽\n\nNos emociona darte la bienvenida oficial a *${clubInfo.nombre}*. ¡Qué alegría tenerte en nuestro equipo!\n\nTu perfil en nuestra plataforma deportiva ya está listo. Desde allí podrás ver tus evaluaciones, llevar control de tu asistencia y gestionar tus pagos de manera súper fácil.\n\nAquí tienes tus credenciales de acceso seguro:\n\n📧 *Usuario:* ${email}\n🔑 *Contraseña:* ${password}\n\n👉 *Ingresa a tu portal aquí:* ${clubLoginUrl}\n\nSi tienes alguna pregunta, ¡no dudes en escribirnos por aquí mismo! Estamos para ayudarte a brillar en la cancha. 🏆✨`;

          await supabaseAdmin.from('mensajes_cola').insert({
            club_id: rel.club_id,
            telefono_destino: perfilOriginal.telefono,
            mensaje: mensajeBienvenida,
            estado: 'Pendiente',
            tipo_mensaje: 'text'
          });
          console.log(`Mensaje de bienvenida encolado para ${perfilOriginal.telefono}`);
        }
      }
    } catch (waError) {
      console.error('Error al encolar mensaje de bienvenida:', waError);
      // No bloqueamos la creación del usuario si falla WhatsApp
    }

    return NextResponse.json({ success: true, userId: authUser.user.id });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
