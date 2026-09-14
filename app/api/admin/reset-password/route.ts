import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const cleanPassword = (newPassword || '').trim();
    if (cleanPassword.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
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

    // 3. Obtener el perfil objetivo
    const { data: targetPerfil } = await supabaseAdmin
      .from('perfiles')
      .select('id, email, email_contacto, club_id')
      .eq('id', userId)
      .single();

    // Aislamiento Multi-tenant: Si es Director, validar que el target pertenezca a su mismo club
    if (isDirector && targetPerfil && targetPerfil.club_id !== callerPerfil.club_id) {
      return NextResponse.json({ error: 'No autorizado (diferente club)' }, { status: 403 });
    }

    // 4. Determinar el Auth ID real del usuario
    let authTargetId = userId;
    const { data: userDirect, error: directErr } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (directErr || !userDirect?.user) {
      // Si userId no es un ID directo de Auth, buscamos en Auth por su email
      const targetEmail = (targetPerfil?.email || targetPerfil?.email_contacto || '').trim().toLowerCase();
      if (targetEmail) {
        let page = 1;
        let foundAuthUser: any = null;
        while (!foundAuthUser && page <= 5) {
          const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
          if (listError || !listData?.users || listData.users.length === 0) break;
          foundAuthUser = listData.users.find((u: any) => u.email?.toLowerCase().trim() === targetEmail);
          if (foundAuthUser || listData.users.length < 1000) break;
          page++;
        }
        if (foundAuthUser) {
          authTargetId = foundAuthUser.id;
        } else {
          return NextResponse.json({ error: 'No se encontró la cuenta de acceso del usuario para resetear su clave.' }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: 'Usuario no encontrado en el sistema de autenticación.' }, { status: 404 });
      }
    }

    // 5. Usamos el cliente admin para forzar el cambio de contraseña y asegurar que el correo esté confirmado
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authTargetId,
      { 
        password: cleanPassword,
        email_confirm: true 
      }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 6. Sincronizar perfiles para asegurar que tenga email y estado activo
    if (targetPerfil) {
      const emailToSync = (targetPerfil.email || targetPerfil.email_contacto || '').trim().toLowerCase();
      if (emailToSync) {
        await supabaseAdmin.from('perfiles').update({
          email: emailToSync,
          email_contacto: emailToSync,
          estado_miembro: 'Activo'
        }).eq('id', targetPerfil.id);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
