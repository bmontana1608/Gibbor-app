import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    // Debug: list received keys
    console.log('[remove-background] Received FormData keys:', [...formData.keys()]);
    // Accept both 'image_file' (official) and legacy 'image' field
    const imageFile = (formData.get('image_file') ?? formData.get('image')) as File | null;
    const club_id = formData.get('club_id') as string | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'Falta la imagen (image_file)', missing: 'image_file' }, { status: 400 });
    }
    if (!club_id) {
      return NextResponse.json({ error: 'Falta club_id', missing: 'club_id' }, { status: 400 });
    }

    const REMOVEBG_API_KEY = process.env.REMOVEBG_API_KEY;
    console.log('[remove-background] API key present:', !!REMOVEBG_API_KEY);

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
      console.error('[remove-background] Remove.bg error', rbRes.status, errText);
      // Fallback: subir la foto original sin quitar el fondo
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = imageFile.name.split('.').pop() || 'jpg';
      const fileNameFallback = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePathFallback = `${club_id}/avatares/${fileNameFallback}`;
      const { error: uploadErrorFallback } = await supabaseAdmin.storage.from('fotos').upload(filePathFallback, buffer, {
        contentType: imageFile.type,
      });
      if (uploadErrorFallback) throw uploadErrorFallback;
      const { data: dataFallback } = supabaseAdmin.storage.from('fotos').getPublicUrl(filePathFallback);
      return NextResponse.json({ publicUrl: dataFallback.publicUrl, fallback: true, removeBgError: errText });
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
