import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/tenant';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const tenant = await getTenant(slug) as any;
  const club_id = tenant?.id;

  if (!club_id) {
    return NextResponse.json({ error: 'Club ID no identificado' }, { status: 401 });
  }

  const entrenador_id = searchParams.get('entrenador_id');

  let query = supabaseAdmin
    .from('categorias')
    .select('*')
    .eq('club_id', club_id);

  if (entrenador_id) {
    query = query.eq('entrenador_id', entrenador_id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...datosParaActualizar } = body;
    
    if (!id) return NextResponse.json({ error: 'Falta el ID' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('categorias')
      .update(datosParaActualizar)
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { error, data } = await supabaseAdmin.from('categorias').insert([body]).select();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
