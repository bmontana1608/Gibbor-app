import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/tenant';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const convocatoriaId = searchParams.get('id');

  const tenant = await getTenant(slug) as any;
  if (!tenant) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
  if (!convocatoriaId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  try {
    // Verificar que la convocatoria pertenece a un evento del club
    const { data: convData, error: errC } = await supabaseAdmin
      .from('convocatorias')
      .select('evento_id, eventos!inner(club_id)')
      .eq('id', convocatoriaId)
      .single();

    if (errC || !convData) throw new Error("Convocatoria no encontrada");
    if (convData.eventos?.club_id !== tenant.id) throw new Error("No autorizado");

    // Borrar la convocatoria
    const { error: errD } = await supabaseAdmin
      .from('convocatorias')
      .delete()
      .eq('id', convocatoriaId);

    if (errD) throw errD;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
