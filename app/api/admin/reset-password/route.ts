import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
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

    // 3. Aislamiento Multi-tenant: Si es Director, validar que el target pertenezca a su mismo club
    if (isDirector) {
      const { data: targetPerfil } = await supabaseAdmin
        .from('perfiles')
        .select('club_id')
        .eq('id', userId)
        .single();

      if (!targetPerfil || targetPerfil.club_id !== callerPerfil.club_id) {
        return NextResponse.json({ error: 'No autorizado (diferente club)' }, { status: 403 });
      }
    }

    // Usamos el cliente admin para forzar el cambio de contraseña
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
