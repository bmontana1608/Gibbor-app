import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/holding/owner
// Retorna el holding cuyo owner_id coincide con el usuario actual
// Se usa para mostrar el botón "Volver al Holding" en el panel de directores
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(null, { status: 401 });
    }

    const { data: holding } = await supabaseAdmin
      .from('holdings')
      .select('id, slug, nombre')
      .eq('owner_id', user.id)
      .single();

    if (!holding) {
      return NextResponse.json(null);
    }

    return NextResponse.json(holding);
  } catch (error: any) {
    return NextResponse.json(null);
  }
}
