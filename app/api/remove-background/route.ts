import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const club_id = formData.get('club_id') as string | null;

    if (!imageFile || !club_id) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const REMOVEBG_API_KEY = process.env.REMOVEBG_API_KEY;

    if (!REMOVEBG_API_KEY) {
      // Si no hay API key, subir la foto original sin quitar el fondo (modo fallback)
      console.warn('[remove-background] Sin REMOVEBG_API_KEY, subiendo foto original.');
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = imageFile.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `${club_id}/avatares/${fileName}`;

      const { error } = await supabaseAdmin.storage.from('fotos').upload(filePath, buffer, {
        contentType: imageFile.type,
      });
      if (error) throw error;
      const { data } = supabaseAdmin.storage.from('fotos').getPublicUrl(filePath);
      return NextResponse.json({ publicUrl: data.publicUrl, fallback: true });
    }

    // Llamar a la API de Remove.bg (HTTP puro, funciona en Vercel serverless)
    const rbFormData = new FormData();
    rbFormData.append('image_file', imageFile);
    rbFormData.append('size', 'auto');

    const rbRes = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVEBG_API_KEY,
      },
      body: rbFormData,
    });

    if (!rbRes.ok) {
      const errText = await rbRes.text();
      console.error('[remove-background] Remove.bg error:', errText);
      throw new Error(`Remove.bg respondió con error ${rbRes.status}`);
    }

    // Remove.bg devuelve directamente el PNG sin fondo
    const pngBuffer = Buffer.from(await rbRes.arrayBuffer());

    // Subir el resultado a Supabase Storage
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const filePath = `${club_id}/avatares/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage.from('fotos').upload(filePath, pngBuffer, {
      contentType: 'image/png',
      upsert: false,
    });

    if (uploadError) throw new Error('Error subiendo a Supabase: ' + uploadError.message);

    const { data } = supabaseAdmin.storage.from('fotos').getPublicUrl(filePath);

    return NextResponse.json({ publicUrl: data.publicUrl });

  } catch (error: any) {
    console.error('[API remove-background]', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
