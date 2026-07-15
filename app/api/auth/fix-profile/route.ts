import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // 1. Verificar si ya tiene perfil (para no hacer nada)
    const { data: existingProfile } = await supabaseAdmin
      .from('perfiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return NextResponse.json({ success: true, message: 'Perfil ya existe' });
    }

    // 2. Buscar perfil huérfano por email
    const { data: orphanProfile } = await supabaseAdmin
      .from('perfiles')
      .select('*')
      .eq('email_contacto', email)
      .neq('id', userId)
      .limit(1)
      .single();

    if (!orphanProfile) {
      return NextResponse.json({ error: 'No se encontró perfil huérfano' }, { status: 404 });
    }

    // 3. Clonar al nuevo ID
    const { error: createError } = await supabaseAdmin
      .from('perfiles')
      .insert([{
        ...orphanProfile,
        id: userId,
        email_contacto: email
      }]);

    if (createError) {
      return NextResponse.json({ error: 'Error al clonar: ' + createError.message }, { status: 500 });
    }

    // 4. Migrar dependencias
    const tablasDependientes = ['pagos_ingresos', 'asistencias', 'evaluaciones_tecnicas', 'clubes_usuarios'];
    for (const tabla of tablasDependientes) {
      await supabaseAdmin
        .from(tabla)
        .update({ [tabla === 'clubes_usuarios' ? 'usuario_id' : 'jugador_id']: userId })
        .eq(tabla === 'clubes_usuarios' ? 'usuario_id' : 'jugador_id', orphanProfile.id)
        .catch(() => {}); // Ignorar si la columna no existe o falla
    }

    // 5. Eliminar el huérfano
    await supabaseAdmin.from('perfiles').delete().eq('id', orphanProfile.id);

    return NextResponse.json({ success: true, message: 'Perfil reparado exitosamente' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
