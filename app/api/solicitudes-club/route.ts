import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/solicitudes-club — envío público del formulario
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre_academia, nombre_director, email, telefono, ciudad, pais, jugadores_estimados, mensaje } = body;

    if (!nombre_academia || !nombre_director || !email) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Verificar que no haya ya una solicitud pendiente con ese email
    const { data: existe } = await supabaseAdmin
      .from('solicitudes_club')
      .select('id, estado')
      .eq('email', email.toLowerCase().trim())
      .in('estado', ['Pendiente', 'En Revisión'])
      .maybeSingle();

    if (existe) {
      return NextResponse.json(
        { error: 'Ya existe una solicitud activa con este correo. Pronto nos pondremos en contacto.' },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin.from('solicitudes_club').insert({
      nombre_academia: nombre_academia.trim(),
      nombre_director: nombre_director.trim(),
      email: email.toLowerCase().trim(),
      telefono: telefono?.trim() || null,
      ciudad: ciudad?.trim() || null,
      pais: pais || 'Colombia',
      jugadores_estimados: jugadores_estimados ? parseInt(jugadores_estimados) : null,
      mensaje: mensaje?.trim() || null,
      estado: 'Pendiente',
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error('Error solicitud club:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}

// GET /api/solicitudes-club — solo para el super admin
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('solicitudes_club')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/solicitudes-club — actualizar estado desde el admin
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, estado, notas_admin } = body;
    if (!id || !estado) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('solicitudes_club')
      .update({ estado, notas_admin: notas_admin || null, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
