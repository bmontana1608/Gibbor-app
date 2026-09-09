import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Obtener la fila existente si ya hay una
    const { data: existing } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('id, canales_pago')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    const targetId = existing?.id || 1;

    // Si viene canales_pago, fusionarlo con lo que ya existía si aplica
    let payload = { ...body, id: targetId };
    if (body.canales_pago && existing?.canales_pago) {
      payload.canales_pago = {
        ...existing.canales_pago,
        ...body.canales_pago
      };
    }
    
    const { error } = await supabaseAdmin
      .from('configuracion_superadmin')
      .upsert(payload);

    if (error) {
      console.error('Error guardando config:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
