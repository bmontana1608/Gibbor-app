import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.activo) {
      await supabaseAdmin.from('anuncios_globales').update({ activo: false }).neq('id', 0);
    }
    const { error } = await supabaseAdmin.from('anuncios_globales').insert([body]);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, activo } = body;
    if (activo) {
      await supabaseAdmin.from('anuncios_globales').update({ activo: false }).neq('id', 0);
    }
    const { error } = await supabaseAdmin.from('anuncios_globales').update({ activo }).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) throw new Error('ID required');
    const { error } = await supabaseAdmin.from('anuncios_globales').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
