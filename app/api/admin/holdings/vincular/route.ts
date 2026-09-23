import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { holding_id, club_id } = await request.json();

    if (!holding_id || !club_id) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('clubes')
      .update({ holding_id })
      .eq('id', club_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error vinculando club al holding:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
