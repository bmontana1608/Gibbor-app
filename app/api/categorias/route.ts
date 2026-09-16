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
  const clubIdParam = searchParams.get('club_id');
  const entrenador_id = searchParams.get('entrenador_id');

  let club_id = clubIdParam;

  // Si se pasa entrenador_id, podemos consultar el club_id real del entrenador para máxima resiliencia
  let coachProfile: any = null;
  if (entrenador_id) {
    const { data } = await supabaseAdmin
      .from('perfiles')
      .select('id, club_id, nombres, apellidos, grupos, rol')
      .eq('id', entrenador_id)
      .maybeSingle();
    coachProfile = data;

    // Si el entrenador tiene un club_id asignado y no vino club_id o el slug cayó en fallback genérico, usar su club_id
    if (coachProfile?.club_id && (!club_id || slug === 'gibbor' || slug === 'default' || slug === 'localhost')) {
      club_id = coachProfile.club_id;
    }
  }

  if (!club_id && slug) {
    const tenant = await getTenant(slug) as any;
    club_id = tenant?.id;
  }

  if (!club_id) {
    return NextResponse.json({ error: 'Club ID no identificado' }, { status: 401 });
  }

  let query = supabaseAdmin
    .from('categorias')
    .select('*')
    .eq('club_id', club_id);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (entrenador_id && data) {
    if (!coachProfile) {
      const { data: cp } = await supabaseAdmin
        .from('perfiles')
        .select('id, club_id, nombres, apellidos, grupos, rol')
        .eq('id', entrenador_id)
        .single();
      coachProfile = cp;
    }

    if (coachProfile) {
      const coachFullName = `${coachProfile.nombres || ''} ${coachProfile.apellidos || ''}`.trim().toLowerCase();
      const coachGroups = (coachProfile.grupos || '')
        .split(',')
        .map((g: string) => g.trim().toLowerCase())
        .filter(Boolean);

      const filtered = data.filter(cat => {
        const matchByName = coachGroups.includes((cat.nombre || '').trim().toLowerCase());
        const matchByTrainer = (cat.entrenadores || '')
          .toLowerCase()
          .includes(coachFullName);

        // Coincidencia flexible de nombres y apellidos
        const coachFirstName = (coachProfile.nombres || '').trim().toLowerCase().split(' ')[0];
        const coachLastName = (coachProfile.apellidos || '').trim().toLowerCase().split(' ')[0];
        const matchByParts = Boolean(
          coachFirstName && coachLastName && 
          (cat.entrenadores || '').toLowerCase().includes(coachFirstName) && 
          (cat.entrenadores || '').toLowerCase().includes(coachLastName)
        );

        return matchByName || matchByTrainer || matchByParts;
      });

      // Si es Director o SuperAdmin y no tiene categorías asignadas individualmente, permitir ver todas las del club
      if (filtered.length === 0 && (coachProfile.rol === 'Director' || coachProfile.rol === 'SuperAdmin')) {
        return NextResponse.json(data);
      }

      return NextResponse.json(filtered);
    }
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
