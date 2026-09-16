import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');

    if (!clubId) {
      return NextResponse.json({ error: 'clubId es requerido' }, { status: 400 });
    }

    const { data: formularios, error } = await supabaseAdmin
      .from('formularios')
      .select('id, club_id, titulo, descripcion, estado, created_at, updated_at, campos, logo_url, banner_url')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const formIds = (formularios || []).map(f => f.id);
    const conteos: Record<string, number> = {};

    if (formIds.length > 0) {
      const { data: respuestas } = await supabaseAdmin
        .from('formulario_respuestas')
        .select('formulario_id')
        .in('formulario_id', formIds);

      if (respuestas) {
        respuestas.forEach(r => {
          conteos[r.formulario_id] = (conteos[r.formulario_id] || 0) + 1;
        });
      }
    }

    const formulariosConConteo = (formularios || []).map(f => ({
      ...f,
      total_respuestas: conteos[f.id] || 0,
      total_campos: Array.isArray(f.campos) ? f.campos.length : 0
    }));

    return NextResponse.json({ formularios: formulariosConConteo });
  } catch (error: any) {
    console.error('Error GET /api/formularios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clubId, titulo, descripcion, campos, estado = 'activo', creadoPor, logo_url, banner_url } = body;

    if (!clubId || !titulo) {
      return NextResponse.json({ error: 'clubId y titulo son requeridos' }, { status: 400 });
    }

    const { data: nuevoForm, error } = await supabaseAdmin
      .from('formularios')
      .insert({
        club_id: clubId,
        titulo: titulo.trim(),
        descripcion: (descripcion || '').trim(),
        campos: Array.isArray(campos) ? campos : [],
        estado,
        logo_url: logo_url || null,
        banner_url: banner_url || null,
        creado_por: creadoPor || null
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ formulario: nuevoForm }, { status: 201 });
  } catch (error: any) {
    console.error('Error POST /api/formularios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
