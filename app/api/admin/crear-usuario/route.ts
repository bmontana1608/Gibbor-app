import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { email, password, perfilId, rol } = await request.json();

    if (!email || !password || !perfilId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // 1. Intentar crear el usuario en Supabase Auth
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

    // 2. MIGRACIÓN SEGURA (Copiar -> Migrar -> Eliminar)
    
    // 2.1 Obtener los datos actuales del perfil
    const { data: perfilOriginal, error: getError } = await supabaseAdmin
      .from('perfiles')
      .select('*')
      .eq('id', perfilId)
      .single();

    if (getError || !perfilOriginal) {
       return NextResponse.json({ error: 'No se encontró el perfil original' }, { status: 404 });
    }

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

    return NextResponse.json({ success: true, userId: authUser.user.id });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
