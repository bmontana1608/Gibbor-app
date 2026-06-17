import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usar Service Role Key para evadir las restricciones RLS (Solo para uso interno administrativo)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    const { data, error } = await supabaseAdmin
      .from('embajadores')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
