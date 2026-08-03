import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Falta teléfono' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('crm_whatsapp_messages')
      .select('*')
      .eq('numero_telefono', phone)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching CRM messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
