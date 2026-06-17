import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usar Service Role Key para evadir las restricciones RLS (Solo para uso interno administrativo)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const password = payload.password;
    delete payload.password; // Remove password from payload before inserting into embajadores

    // 1. Crear el usuario en Supabase Auth
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: password,
      email_confirm: true
    });
    if (authError) throw authError;

    // 2. Crear el perfil con rol 'embajador'
    const { error: perfilError } = await supabaseAdmin
      .from('perfiles')
      .insert({
        id: newUser.user.id,
        nombres: payload.nombre_completo.split(' ')[0],
        apellidos: payload.nombre_completo.split(' ').slice(1).join(' '),
        rol: 'embajador'
      });
    if (perfilError) throw perfilError;

    // 3. Crear el embajador
    payload.user_id = newUser.user.id;
    const { data, error } = await supabaseAdmin
      .from('embajadores')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
