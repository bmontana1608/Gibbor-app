import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const { data: mensajes, error } = await supabaseAdmin
      .from('tickets_mensajes')
      .select('*, perfiles(nombres)')
      .eq('ticket_id', id)
      .order('creado_en', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, mensajes });
  } catch (error: any) {
    console.error('Error obteniendo mensajes:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { mensaje, remitenteId, esStaff } = await request.json();

    if (!mensaje || !remitenteId) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // Insertar el mensaje
    const { data: nuevoMensaje, error } = await supabaseAdmin
      .from('tickets_mensajes')
      .insert({
        ticket_id: id,
        remitente_id: remitenteId,
        es_staff: esStaff || false,
        mensaje
      })
      .select('*, perfiles(nombres)')
      .single();

    if (error) throw error;

    // Si el mensaje es de staff, marcar ticket como "En Progreso" si estaba Abierto
    if (esStaff) {
      await supabaseAdmin.from('tickets_soporte').update({ estado: 'En Progreso' }).eq('id', id).eq('estado', 'Abierto');
    }

    // Actualizar el "actualizado_en" del ticket
    await supabaseAdmin.from('tickets_soporte').update({ actualizado_en: new Date().toISOString() }).eq('id', id);

    return NextResponse.json({ success: true, mensaje: nuevoMensaje });
  } catch (error: any) {
    console.error('Error enviando mensaje:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
