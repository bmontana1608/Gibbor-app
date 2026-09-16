import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/tenant';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { evento_id, minuto, tipo_accion, jugador_id, jugador_sale_id, comentario, tenantSlug, es_local } = body;

    const tenant = await getTenant(tenantSlug) as any;
    if (!tenant) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from('eventos_minuto_minuto')
      .insert({
        evento_id,
        minuto,
        tipo_accion,
        jugador_id: jugador_id || null,
        jugador_sale_id: jugador_sale_id || null,
        comentario: comentario || null
      })
      .select()
      .single();

    if (error) throw error;

    // Si es gol, actualizamos el marcador en eventos
    if (tipo_accion === 'Gol' || tipo_accion === 'Gol Contra') {
       // El parámetro es_local nos indica si nuestro club juega de local o de visitante.
       const esLocalBool = es_local !== false;
       let campoActualizar = 'marcador_local';
       
       if (esLocalBool) {
           // Somos el Local. Gol a favor -> marcador_local, Gol rival -> marcador_visitante
           campoActualizar = (tipo_accion === 'Gol') ? 'marcador_local' : 'marcador_visitante';
       } else {
           // Somos el Visitante. Gol a favor -> marcador_visitante, Gol rival -> marcador_local
           campoActualizar = (tipo_accion === 'Gol') ? 'marcador_visitante' : 'marcador_local';
       }
       
       await supabaseAdmin.rpc('incrementar_marcador', { 
           p_evento_id: evento_id, 
           p_campo: campoActualizar 
       });
       // NOTA: Como no tenemos el RPC incrementar_marcador, hacemos fetch y update manual
       const { data: evData } = await supabaseAdmin.from('eventos').select(campoActualizar).eq('id', evento_id).single();
       if (evData) {
           await supabaseAdmin.from('eventos').update({
               [campoActualizar]: (evData[campoActualizar as keyof typeof evData] as number || 0) + 1
           }).eq('id', evento_id);
       }
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const evento_id = searchParams.get('evento_id');
  const tipo_accion = searchParams.get('tipo_accion');
  const jugador_id = searchParams.get('jugador_id'); // para saber si era a favor
  const es_local = searchParams.get('es_local') !== 'false';

  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  try {
    const { error } = await supabaseAdmin
      .from('eventos_minuto_minuto')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Si borramos un gol, restar del marcador
    if ((tipo_accion === 'Gol' || tipo_accion === 'Gol Contra') && evento_id) {
       let campoActualizar = 'marcador_local';
       
       if (es_local) {
           campoActualizar = (tipo_accion === 'Gol') ? 'marcador_local' : 'marcador_visitante';
       } else {
           campoActualizar = (tipo_accion === 'Gol') ? 'marcador_visitante' : 'marcador_local';
       }

       const { data: evData } = await supabaseAdmin.from('eventos').select(campoActualizar).eq('id', evento_id).single();
       if (evData) {
           const currentVal = evData[campoActualizar as keyof typeof evData] as number || 0;
           await supabaseAdmin.from('eventos').update({
               [campoActualizar]: Math.max(0, currentVal - 1)
           }).eq('id', evento_id);
       }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
