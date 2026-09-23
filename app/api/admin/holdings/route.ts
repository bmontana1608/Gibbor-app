import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { nombre, slug, owner_email } = await request.json();

    if (!nombre || !slug || !owner_email) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    // 1. Buscar al dueño por email en la tabla perfiles
    const { data: perfiles, error: perfilError } = await supabaseAdmin
      .from('perfiles')
      .select('id, email, email_contacto')
      .or(`email.eq.${owner_email},email_contacto.eq.${owner_email}`)
      .limit(1);

    if (perfilError || !perfiles || perfiles.length === 0) {
      return NextResponse.json({ error: 'No se encontró ningún usuario con ese email en la plataforma.' }, { status: 404 });
    }

    const owner_id = perfiles[0].id;

    // 2. Crear el holding
    const { data, error: insertError } = await supabaseAdmin
      .from('holdings')
      .insert([
        {
          nombre,
          slug,
          owner_id
        }
      ])
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un holding con ese slug/URL' }, { status: 400 });
      }
      throw insertError;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creando holding:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
