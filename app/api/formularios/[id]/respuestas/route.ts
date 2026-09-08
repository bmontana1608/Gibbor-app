import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID de formulario es requerido' }, { status: 400 });
    }

    // Obtener formulario para tener los metadatos de los campos
    const { data: form, error: formError } = await supabaseAdmin
      .from('formularios')
      .select('id, titulo, campos, club_id')
      .eq('id', id)
      .single();

    if (formError || !form) {
      return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 });
    }

    // Obtener todas las respuestas
    const { data: respuestas, error: respError } = await supabaseAdmin
      .from('formulario_respuestas')
      .select('*')
      .eq('formulario_id', id)
      .order('created_at', { ascending: false });

    if (respError) {
      throw respError;
    }

    return NextResponse.json({
      formulario: form,
      respuestas: respuestas || []
    });

  } catch (error: any) {
    console.error('Error GET /api/formularios/[id]/respuestas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { respuestas, archivos = [] } = body;

    if (!respuestas || typeof respuestas !== 'object') {
      return NextResponse.json({ error: 'Las respuestas son requeridas' }, { status: 400 });
    }

    // Verificar si el formulario existe y está activo
    const { data: form, error: formError } = await supabaseAdmin
      .from('formularios')
      .select('id, club_id, estado, campos')
      .eq('id', id)
      .single();

    if (formError || !form) {
      return NextResponse.json({ error: 'El formulario no existe' }, { status: 404 });
    }

    if (form.estado !== 'activo') {
      return NextResponse.json({ error: 'Este formulario ya no está recibiendo respuestas.' }, { status: 403 });
    }

    // Validar campos requeridos
    const campos: any[] = form.campos || [];
    for (const campo of campos) {
      if (campo.requerido) {
        const val = respuestas[campo.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          return NextResponse.json({ error: `El campo "${campo.label}" es obligatorio.` }, { status: 400 });
        }
      }
    }

    // Guardar respuesta
    const { data: nuevaRespuesta, error: insertError } = await supabaseAdmin
      .from('formulario_respuestas')
      .insert({
        formulario_id: id,
        club_id: form.club_id,
        respuestas,
        archivos
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      id: nuevaRespuesta.id,
      message: 'Respuesta guardada con éxito'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error POST /api/formularios/[id]/respuestas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const respuestaId = searchParams.get('respuestaId');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'ID de formulario es requerido' }, { status: 400 });
    }

    if (respuestaId) {
      const { error } = await supabaseAdmin
        .from('formulario_respuestas')
        .delete()
        .eq('id', respuestaId)
        .eq('formulario_id', id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Respuesta eliminada' });
    } else if (deleteAll) {
      const { error } = await supabaseAdmin
        .from('formulario_respuestas')
        .delete()
        .eq('formulario_id', id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Todas las respuestas han sido eliminadas' });
    } else {
      return NextResponse.json({ error: 'Debe especificar respuestaId o deleteAll=true' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error DELETE /api/formularios/[id]/respuestas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

