import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

import { getTenant } from '@/lib/tenant';

async function getClubIdFromHost(request: Request) {
  const tenant = await getTenant() as any;
  return tenant?.id || null;
}

export async function GET(request: Request) {
  const clubId = await getClubIdFromHost(request);
  if (!clubId) return NextResponse.json([], { status: 200 });

  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get('categoria');

  let query = supabaseAdmin
    .from('eventos')
    .select('*')
    .eq('club_id', clubId) // FILTRO DE SEGURIDAD
    .gte('fecha', new Date().toISOString().split('T')[0])
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true });

  if (categoria) {
    query = query.or(`categoria_id.eq.${categoria},categoria_id.is.null`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const clubId = await getClubIdFromHost(request);
  if (!clubId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const payload = { ...body, club_id: clubId };

  const { data, error } = await supabaseAdmin.from('eventos').insert([payload]).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const clubId = await getClubIdFromHost(request);
  if (!clubId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  // Borramos solo si pertenece al club
  const { error } = await supabaseAdmin
    .from('eventos')
    .delete()
    .eq('id', id)
    .eq('club_id', clubId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
