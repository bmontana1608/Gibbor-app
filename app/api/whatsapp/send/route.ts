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

    // 1. VERIFICACIÓN DE ESTADO DE LA INSTANCIA (Zero-Trust con Fallback inteligente de Doble Chequeo)
    let instanceReady = false;
    try {
      const statusRes = await fetch(`${cleanUrl}/instance/connectionState/${instance}`, {
        headers: { 'apikey': EVOLUTION_API_KEY }
      });
      const statusData = await statusRes.json();
      const rawState = statusData?.instance?.state || statusData?.state || 'disconnected';
      let isActuallyConnected = rawState === 'open';

      // Doble chequeo para evitar el bug de caché de Evolution API
      if (isActuallyConnected) {
        try {
          const listRes = await fetch(`${cleanUrl}/instance/fetchInstances`, {
            headers: { 'apikey': EVOLUTION_API_KEY },
            signal: AbortSignal.timeout(5000)
          });
          if (listRes.ok) {
            const listData = await listRes.ok ? await listRes.json() : [];
            const thisInst = Array.isArray(listData) ? listData.find((i: any) => i.name === instance || i.instanceName === instance) : null;
            if (thisInst) {
              // Se elimina el chequeo de disconnectionReasonCode y disconnectionAt ya que son persistentes e históricos
              // y causaban falsos positivos de desconexión. Solo confiamos en connectionStatus.
              if (thisInst.connectionStatus !== 'open') {
                console.log(`[EVO-SEND-CHECK] ⚠️ Instancia '${instance}' detectada como desvinculada físicamente (status: ${thisInst.connectionStatus}).`);
                isActuallyConnected = false;
              }
            }
          }
        } catch (err) {
          console.warn('[EVO-SEND-CHECK] Error re-verificando con fetchInstances:', err);
        }
      }

      if (isActuallyConnected) {
        instanceReady = true;
      }
    } catch (e) {
      console.warn(`No se pudo verificar el estado de la instancia '${instance}', procediendo con precaución...`, e);
    }

    if (!instanceReady) {
      return NextResponse.json({
        error: 'WhatsApp Desconectado',
        details: `El canal de WhatsApp del club (${decodeURIComponent(instance)}) no está conectado o ha sido desvinculado. Por favor, ve a Configuración > Asistente de WhatsApp en tu club y escanea el código QR nuevamente para restablecer el servicio.`
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
