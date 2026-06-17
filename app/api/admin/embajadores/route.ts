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
         rol: 'Embajador'
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

export async function PUT(request: Request) {
  try {
    const payload = await request.json();
    const { id, user_id, password, ...updateData } = payload;
    let finalUserId = user_id;

    if (!finalUserId) {
       // Legacy ambassador sin cuenta de login
       if (!password) throw new Error("Para habilitar el acceso a un embajador antiguo, debes asignarle una contraseña obligatoriamente.");
       
       const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
         email: updateData.email,
         password: password,
         email_confirm: true
       });
       if (authError) throw authError;

       const { error: perfilError } = await supabaseAdmin.from('perfiles').insert({
         id: newUser.user.id,
         nombres: updateData.nombre_completo?.split(' ')[0] || '',
         apellidos: updateData.nombre_completo?.split(' ').slice(1).join(' ') || '',
         rol: 'Embajador'
       });
       if (perfilError) throw perfilError;
       
       finalUserId = newUser.user.id;
       updateData.user_id = finalUserId;
    } else {
       // Embajador con cuenta, actualizar credenciales si se enviaron
       const authUpdates: any = {};
       if (updateData.email) authUpdates.email = updateData.email;
       if (password && password.trim() !== '') authUpdates.password = password;
       
       if (Object.keys(authUpdates).length > 0) {
         const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(finalUserId, authUpdates);
         if (authError) throw authError;
       }

       if (updateData.nombre_completo) {
         await supabaseAdmin.from('perfiles').update({
           nombres: updateData.nombre_completo.split(' ')[0],
           apellidos: updateData.nombre_completo.split(' ').slice(1).join(' ')
         }).eq('id', finalUserId);
       }
    }

    // Actualizar embajadores
    const { data, error } = await supabaseAdmin
      .from('embajadores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

