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
    let instance = encodeURIComponent(instanceName || 'gibbor');

    console.log(`[WA-SEND] Iniciando envio | instancia: ${instance} | telefono: ${telefono} | tiene_media: ${!!mediaBase64}`);

    // 1. VERIFICACIÓN DE ESTADO DE LA INSTANCIA
    let instanceReady = false;
    try {
      const statusRes = await fetch(`${cleanUrl}/instance/connectionState/${instance}`, {
        headers: { 'apikey': EVOLUTION_API_KEY }
      });
      const statusData = await statusRes.json();
      const rawState = statusData?.instance?.state || statusData?.state || 'disconnected';
      let isActuallyConnected = rawState === 'open';

      console.log(`[WA-SEND] Estado instancia '${instance}': ${rawState}`);

      if (isActuallyConnected) {
        instanceReady = true;
      }
    } catch (e) {
      console.warn(`[WA-SEND] No se pudo verificar el estado de la instancia '${instance}':`, e);
    }

    // NOTA: Se eliminó el fallback a la instancia 'gibbor' para evitar que los mensajes
    // de los clubes salgan desde el número principal de la aplicación cuando su WhatsApp
    // está desconectado. En su lugar, fallará y mostrará el error al usuario.

    if (!instanceReady) {
      return NextResponse.json({
        error: 'WhatsApp Desconectado',
        details: 'El canal de WhatsApp (la sesión) ha sido desvinculada desde el teléfono o está desconectada. Por favor, ve a Configuración > Asistente de WhatsApp y escanea el código QR nuevamente para restablecer el servicio.'
      }, { status: 503 });
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

    console.log(`[WA-SEND] Enviando a Evolution API | url: ${url} | numero: ${telefono}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(body)
    });

    console.log(`[WA-SEND] Respuesta Evolution API | status: ${response.status} | ok: ${response.ok}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WA-SEND] ❌ Error de Evolution API | status: ${response.status} | body: ${errorText.substring(0, 500)}`);
      let errorDetail = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.message || errorJson.error || errorText;
      } catch (e) {
        // No es JSON, usar texto plano
      }
      return NextResponse.json({ error: errorDetail || response.statusText }, { status: response.status });
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonErr: any) {
      const rawText = await response.text().catch(() => '(no body)');
      console.error(`[WA-SEND] ❌ Respuesta no es JSON válido | body: ${rawText.substring(0, 200)}`);
      return NextResponse.json({ error: `Respuesta inválida de Evolution API: ${rawText.substring(0, 100)}` }, { status: 502 });
    }

    console.log(`[WA-SEND] ✅ Mensaje enviado correctamente | instancia: ${instance}`);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[WA-SEND] ❌ Error interno no capturado:', error.message, error.stack);
    return NextResponse.json({ error: error.message || 'Error interno en el servidor de WhatsApp' }, { status: 500 });
  }
}

