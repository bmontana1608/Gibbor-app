import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const maxDuration = 60; // Vercel: max 60 segundos para este endpoint

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const club_id = formData.get('club_id') as string | null;

    if (!imageFile || !club_id) {
      return NextResponse.json({ error: 'Faltan parámetros: image y club_id son requeridos' }, { status: 400 });
    }

    // Convertir el File a Buffer para procesarlo en el servidor
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Importación dinámica para evitar problemas de bundle en cliente
    const { removeBackground } = await import('@imgly/background-removal-node');

    // Procesar la imagen con IA para quitar el fondo
    const resultBlob = await removeBackground(buffer);

    // Convertir el Blob resultado a Buffer para subir a Supabase
    const resultArrayBuffer = await resultBlob.arrayBuffer();
    const resultBuffer = Buffer.from(resultArrayBuffer);

    // Subir el PNG resultante (sin fondo) a Supabase Storage
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const filePath = `${club_id}/avatares/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('fotos')
      .upload(filePath, resultBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      throw new Error('Error al subir a Supabase: ' + uploadError.message);
    }

    const { data } = supabaseAdmin.storage.from('fotos').getPublicUrl(filePath);

    return NextResponse.json({ publicUrl: data.publicUrl });

  } catch (error: any) {
    console.error('[API remove-background]', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
