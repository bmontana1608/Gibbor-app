import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId, action, payload } = await request.json();
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser();

    if (!adminUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    let result;
    if (action === 'RESET_PASSWORD') {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: payload.newPassword }
      );
      if (error) throw error;
      result = data;
    } else if (action === 'CHANGE_EMAIL') {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email: payload.newEmail }
      );
      if (error) throw error;
      result = data;
    } else if (action === 'CREATE_ADMIN') {
        // Crear nuevo usuario en Auth
        const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: payload.email,
            password: payload.password,
            email_confirm: true
        });
        if (authError) throw authError;

        // Crear perfil SuperAdmin
        const { error: perfilError } = await supabaseAdmin
            .from('perfiles')
            .insert({
                id: newUser.user.id,
                nombres: payload.nombres,
                apellidos: payload.apellidos,
                rol: 'SuperAdmin'
            });
        if (perfilError) throw perfilError;
        result = newUser;
    }

    // Registrar en Auditoría
    await supabaseAdmin.from('logs_admin').insert({
      admin_id: adminUser.id,
      accion: action,
      entidad_tipo: 'auth_users',
      entidad_id: userId || result?.user?.id || 'new_admin',
      detalles: { ...payload, password: '****' }
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
