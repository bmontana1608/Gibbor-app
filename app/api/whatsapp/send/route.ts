import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { telefono, mensaje, mediaBase64, tipoMedia, fileName, instanceName } = await request.json();

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return NextResponse.json({ error: 'Faltan variables de entorno EVOLUTION_API_URL o EVOLUTION_API_KEY' }, { status: 500 });
    }

    const cleanUrl = EVOLUTION_API_URL.endsWith('/') ? EVOLUTION_API_URL.slice(0, -1) : EVOLUTION_API_URL;
    const instance = encodeURIComponent(instanceName || 'default');

    // 1. VERIFICACIÓN DE ESTADO DE LA INSTANCIA (Zero-Trust)
    try {
      const statusRes = await fetch(`${cleanUrl}/instance/connectionState/${instance}`, {
        headers: { 'apikey': EVOLUTION_API_KEY }
      });
      const statusData = await statusRes.json();
      
      if (statusData.instance?.state !== 'open') {
        return NextResponse.json({ 
          error: `La instancia de WhatsApp '${instance}' no está conectada. Por favor, escanea el código QR en la configuración.`,
          state: statusData.instance?.state 
        }, { status: 400 });
      }
    } catch (e) {
      console.warn('No se pudo verificar el estado de la instancia, procediendo con el envío...', e);
    }

    const endpoint = mediaBase64 ? 'sendMedia' : 'sendText';
    const url = `${cleanUrl}/message/${endpoint}/${instance}`;
    
    let body: any = { number: telefono };

    if (mediaBase64) {
      body = {
        ...body,
        media: mediaBase64,
        mediatype: tipoMedia,
        mimetype: tipoMedia === 'document' ? 'application/pdf' : 'image/png',
        fileName: fileName,
        caption: mensaje
      };
    } else {
      body = {
        ...body,
        text: mensaje,
        delay: 1200,
        linkPreview: true
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.message || errorJson.error || errorText;
      } catch (e) {
        // No es JSON, usar texto plano
      }
      return NextResponse.json({ error: errorDetail || response.statusText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API WhatsApp Route Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno en el servidor de WhatsApp' }, { status: 500 });
  }
}
