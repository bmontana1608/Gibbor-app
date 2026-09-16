import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Verificar si ya tiene perfil (para no hacer nada)
    const { data: existingProfile } = await supabaseAdmin
      .from('perfiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return NextResponse.json({ success: true, message: 'Perfil ya existe' });
    }

    // 2. Buscar perfil huérfano por email o email_contacto
    const { data: orphanProfile } = await supabaseAdmin
      .from('perfiles')
      .select('*')
      .or(`email.ilike.${cleanEmail},email_contacto.ilike.${cleanEmail}`)
      .neq('id', userId)
      .limit(1)
      .single();

    if (!orphanProfile) {
      return NextResponse.json({ error: 'No se encontró perfil huérfano' }, { status: 404 });
    }

    // 3. Clonar al nuevo ID con columnas seguras
    const SAFE_COLS = [
      'nombres','apellidos','documento_identidad','fecha_nacimiento','telefono',
      'direccion','acudiente_nombre','acudiente_identificacion',
      'tipo_sangre','eps','patologias','talla_uniforme','posicion','categoria_id',
      'grupos','rol','tipo_plan','emergencia_nombre','emergencia_telefono',
      'hijos_config','club_id','fecha_ingreso_club','foto_url','doc_jugador_url',
      'doc_eps_url','doc_acudiente_url','doc_extra_url','estado_pago','fecha_inactivacion'
    ];

    const perfilNuevo: any = { 
      id: userId, 
      email_contacto: cleanEmail, 
      estado_miembro: 'Activo' 
    };

    for (const col of SAFE_COLS) {
      if (col in orphanProfile && orphanProfile[col] !== undefined) {
        perfilNuevo[col] = orphanProfile[col];
      }
    }

    const { error: createError } = await supabaseAdmin
      .from('perfiles')
      .insert([perfilNuevo]);

    if (createError) {
      return NextResponse.json({ error: 'Error al clonar: ' + createError.message }, { status: 500 });
    }

    // 4. Migrar dependencias
    const tablasDependientes = ['pagos_ingresos', 'asistencias', 'evaluaciones_tecnicas', 'clubes_usuarios'];
    for (const tabla of tablasDependientes) {
      await supabaseAdmin
        .from(tabla)
        .update({ [tabla === 'clubes_usuarios' ? 'usuario_id' : 'jugador_id']: userId })
        .eq(tabla === 'clubes_usuarios' ? 'usuario_id' : 'jugador_id', orphanProfile.id);
    }

    // 5. Eliminar el huérfano
    await supabaseAdmin.from('perfiles').delete().eq('id', orphanProfile.id);

    return NextResponse.json({ success: true, message: 'Perfil reparado exitosamente' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
