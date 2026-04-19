import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { email, password, perfilId, rol } = await request.json();

    if (!email || !password || !perfilId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // 1. Crear el usuario en Supabase Auth usando el cliente Admin
    // Esto evita que el usuario tenga que confirmar el email por ahora.
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { rol }
    });

    if (authError) {
      console.error('Error Auth:', authError.message);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // 2. Vincular el nuevo ID de autenticación con el perfil existente
    const { error: perfilError } = await supabaseAdmin
      .from('perfiles')
      .update({ 
        id: authUser.user.id, // Cambiamos el ID del perfil para que coincida con el de Auth
        email_contacto: email 
      })
      .eq('id', perfilId); // El ID temporal que tenía en la base de datos

    if (perfilError) {
      // Si falla la vinculación, borramos el usuario creado para no dejar basura
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      console.error('Error Perfil:', perfilError.message);
      return NextResponse.json({ error: 'Error al vincular el perfil: ' + perfilError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: authUser.user.id });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
