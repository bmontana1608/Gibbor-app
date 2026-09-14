import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, password, perfilId, rol } = await request.json();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword || !perfilId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener mínimo 6 caracteres' }, { status: 400 });
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
      email: cleanEmail,
      password: cleanPassword,
      email_confirm: true,
      user_metadata: { rol: rol || perfilOriginal.rol || 'Futbolista' }
    });

    let finalAuthUserId = authUser?.user?.id;

    if (authError) {
      const isAlreadyRegistered = 
        authError.message.toLowerCase().includes('already') || 
        authError.message.toLowerCase().includes('exists') || 
        authError.status === 422;

      if (!isAlreadyRegistered) {
        console.error('Error Auth:', authError.message);
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }

      // CASO: EL USUARIO YA EXISTE EN SUPABASE AUTH
      // Buscamos el usuario en Auth por su email
      let existingAuthUser: any = null;
      let page = 1;
      while (!existingAuthUser && page <= 5) {
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (listError || !listData?.users || listData.users.length === 0) break;
        existingAuthUser = listData.users.find((u: any) => u.email?.toLowerCase().trim() === cleanEmail);
        if (existingAuthUser || listData.users.length < 1000) break;
        page++;
      }

      if (!existingAuthUser) {
        return NextResponse.json({ error: 'El usuario figura como registrado en Auth pero no se pudo recuperar.' }, { status: 500 });
      }

      finalAuthUserId = existingAuthUser.id;

      // ACTUALIZAR OBLIGATORIAMENTE LA CONTRASEÑA EN AUTH CON LA CLAVE TEMPORAL PROPORCIONADA
      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(
        existingAuthUser.id,
        { 
          password: cleanPassword,
          email_confirm: true
        }
      );

      if (updateAuthErr) {
        console.error('Error al actualizar contraseña de usuario existente:', updateAuthErr.message);
        return NextResponse.json({ error: 'Error al actualizar credenciales: ' + updateAuthErr.message }, { status: 500 });
      }

      // Verificar si ya existe un perfil con ese ID de Auth
      const { data: profileWithAuthId } = await supabaseAdmin
        .from('perfiles')
        .select('id')
        .eq('id', existingAuthUser.id)
        .maybeSingle();

      if (!profileWithAuthId) {
        // Ningún perfil usa el ID de Auth todavía: podemos migrar el perfil original a este ID
        if (perfilOriginal.id !== existingAuthUser.id) {
          const { error: cloneErr } = await supabaseAdmin
            .from('perfiles')
            .insert([{
              ...perfilOriginal,
              id: existingAuthUser.id,
              email: cleanEmail,
              email_contacto: cleanEmail,
              estado_miembro: 'Activo'
            }]);

          if (!cloneErr) {
            const tablasDependientes = ['pagos_ingresos', 'asistencias', 'evaluaciones_tecnicas', 'clubes_usuarios'];
            for (const tabla of tablasDependientes) {
              await supabaseAdmin
                .from(tabla)
                .update({ [tabla === 'clubes_usuarios' ? 'usuario_id' : 'jugador_id']: existingAuthUser.id })
                .eq(tabla === 'clubes_usuarios' ? 'usuario_id' : 'jugador_id', perfilId);
            }
            await supabaseAdmin.from('perfiles').delete().eq('id', perfilId);
          } else {
            // Si falla el insert, actualizar el perfil actual
            await supabaseAdmin
              .from('perfiles')
              .update({ 
                estado_miembro: 'Activo',
                email: cleanEmail,
                email_contacto: cleanEmail 
              })
              .eq('id', perfilId);
          }
        } else {
          await supabaseAdmin
            .from('perfiles')
            .update({ 
              estado_miembro: 'Activo',
              email: cleanEmail,
              email_contacto: cleanEmail 
            })
            .eq('id', existingAuthUser.id);
        }
      } else {
        // Ya existe otro perfil con ese ID (caso de hermanos/cuenta familiar)
        // El perfil actual mantiene su perfilId pero se activa y sincroniza email
        const { error: activateError } = await supabaseAdmin
          .from('perfiles')
          .update({ 
            estado_miembro: 'Activo',
            email: cleanEmail,
            email_contacto: cleanEmail 
          })
          .eq('id', perfilId);

        if (activateError) {
          return NextResponse.json({ error: 'Error al activar perfil familiar: ' + activateError.message }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Perfil vinculado a cuenta familiar y contraseña actualizada',
          isFamilyLink: true,
          userId: existingAuthUser.id
        });
      }
    } else {
      // 6. MIGRACIÓN SEGURA PARA USUARIO NUEVO (Copiar -> Migrar -> Eliminar)
      const { error: createError } = await supabaseAdmin
        .from('perfiles')
        .insert([{
          ...perfilOriginal,
          id: authUser.user.id,
          email: cleanEmail,
          email_contacto: cleanEmail,
          estado_miembro: 'Activo'
        }]);

      if (createError) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        return NextResponse.json({ error: 'Error al clonar perfil: ' + createError.message }, { status: 500 });
      }

      // Migrar dependencias al nuevo ID
      const tablasDependientes = ['pagos_ingresos', 'asistencias', 'evaluaciones_tecnicas', 'clubes_usuarios'];
      for (const tabla of tablasDependientes) {
        await supabaseAdmin
          .from(tabla)
          .update({ [tabla === 'clubes_usuarios' ? 'usuario_id' : 'jugador_id']: authUser.user.id })
          .eq(tabla === 'clubes_usuarios' ? 'usuario_id' : 'jugador_id', perfilId);
      }

      // Eliminar el perfil antiguo
      await supabaseAdmin.from('perfiles').delete().eq('id', perfilId);
    }

    // ==========================================
    // 7. MENSAJE DE BIENVENIDA (WHATSAPP)
    // ==========================================
    try {
      const clubTargetId = perfilOriginal.club_id;

      if (clubTargetId) {
        const { data: clubInfo } = await supabaseAdmin
          .from('clubes')
          .select('slug, nombre')
          .eq('id', clubTargetId)
          .single();

        const { data: waConfig } = await supabaseAdmin
          .from('configuracion_wa')
          .select('active_webhook')
          .eq('club_id', clubTargetId)
          .single();

        const bienvenidaActiva = waConfig?.active_webhook === true;

        if (clubInfo && bienvenidaActiva && perfilOriginal?.telefono) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.masterclubmanager.com';
          const clubLoginUrl = `${appUrl}/${clubInfo.slug}/login`;
          
          const mensajeBienvenida = `¡Hola ${perfilOriginal.nombres}! 👋⚽\n\nNos emociona darte la bienvenida oficial a *${clubInfo.nombre}*. ¡Qué alegría tenerte en nuestro equipo!\n\nTu perfil en nuestra plataforma deportiva ya está listo. Desde allí podrás ver tus evaluaciones, llevar control de tu asistencia y gestionar tus pagos de manera súper fácil.\n\nAquí tienes tus credenciales de acceso seguro:\n\n📧 *Usuario:* ${cleanEmail}\n🔑 *Contraseña:* ${cleanPassword}\n\n👉 *Ingresa a tu portal aquí:* ${clubLoginUrl}\n\nSi tienes alguna pregunta, ¡no dudes en escribirnos por aquí mismo! Estamos para ayudarte a brillar en la cancha. 🏆✨`;

          await supabaseAdmin.from('mensajes_cola').insert({
            club_id: clubTargetId,
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
    }

    return NextResponse.json({ success: true, userId: finalAuthUserId });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
