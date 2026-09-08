import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const { data: formulario, error } = await supabaseAdmin
      .from('formularios')
      .select('*, clubes (id, nombre, slug, logo_url, color_primario)')
      .eq('id', id)
      .single();

    if (error || !formulario) {
      return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ formulario });
  } catch (error: any) {
    console.error('Error GET /api/formularios/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { titulo, descripcion, campos, estado } = body;

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (titulo !== undefined) updateData.titulo = titulo.trim();
    if (descripcion !== undefined) updateData.descripcion = descripcion.trim();
    if (campos !== undefined) updateData.campos = Array.isArray(campos) ? campos : [];
    if (estado !== undefined) updateData.estado = estado;

    const { data: actualizado, error } = await supabaseAdmin
      .from('formularios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ formulario: actualizado });
  } catch (error: any) {
    console.error('Error PUT /api/formularios/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('formularios')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error DELETE /api/formularios/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
