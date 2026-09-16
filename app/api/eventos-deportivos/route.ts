import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    if (!payload.club_id) {
      return NextResponse.json({ error: 'club_id requerido' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('eventos_deportivos')
      .insert([payload])
      .select();

    if (error) {
      console.error('Error insertando evento deportivo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clubId = searchParams.get('club_id');
    
    if (!id || !clubId) {
      return NextResponse.json({ error: 'ID y club_id requeridos' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('eventos_deportivos')
      .delete()
      .eq('id', id)
      .eq('club_id', clubId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
