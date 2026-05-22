import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin'; // If needed, else bypass DB check here and do it in frontend

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Falta el parámetro slug' }, { status: 400 });

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return NextResponse.json({ error: 'Faltan variables de entorno EVOLUTION' }, { status: 500 });
    }

    const cleanUrl = EVOLUTION_API_URL.endsWith('/') ? EVOLUTION_API_URL.slice(0, -1) : EVOLUTION_API_URL;
    const instanceName = encodeURIComponent(slug);

    // 0. Pre-check API Health
    try {
      const health = await fetch(`${cleanUrl}/`, { signal: AbortSignal.timeout(5000) });
      console.log(`[EVO-HEALTH] Status: ${health.status}`);
    } catch (e: any) {
      console.error('[EVO-HEALTH-ERROR]', e.message);
      return NextResponse.json({ 
        error: 'Servidor de WhatsApp inalcanzable', 
        details: `No pudimos conectar con ${cleanUrl}. ¿Está el servidor activo?` 
      }, { status: 503 });
    }

    // 1. Check Connection State
    console.log(`[EVO-CHECK] Verificando estado de instancia: ${instanceName} en ${cleanUrl}`);
    let stateResponse = await fetch(`${cleanUrl}/instance/connectionState/${instanceName}`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });

    console.log(`[EVO-CHECK] Status: ${stateResponse.status}`);

    if (stateResponse.status !== 200 && stateResponse.status !== 404) {
      const errorText = await stateResponse.text();
      console.error('Evolution State Check Error:', errorText);
      return NextResponse.json({ 
        error: 'Error al consultar estado en Evolution', 
        details: errorText 
      }, { status: stateResponse.status });
    }

    if (stateResponse.status === 404) {
      // Instance doesn't exist, create it
      const createBody = {
        instanceName: slug,
        token: slug,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      };

      console.log(`[EVO-CREATE] Intentando crear instancia en: ${cleanUrl}/instance/create`);
      console.log(`[EVO-CREATE] Body:`, createBody);

      const createResponse = await fetch(`${cleanUrl}/instance/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'apikey': EVOLUTION_API_KEY 
        },
        body: JSON.stringify(createBody)
      });
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Evolution Create Error:', errorText);
        return NextResponse.json({ 
          error: 'Error creando instancia en Evolution', 
          details: errorText 
        }, { status: createResponse.status });
      }
      
      const createData = await createResponse.json();
      return NextResponse.json({ 
        status: 'qr', 
        qr: createData.qrcode?.base64 || createData.hash?.qrcode, 
        message: 'Instancia creada, escanea el QR' 
      });
    }

    // Si la respuesta es 200, verificamos detalladamente
    const stateData = await stateResponse.json();
    const rawState = stateData?.instance?.state || stateData?.state || 'disconnected';
    let isActuallyConnected = rawState === 'open';

    // Evitar bug de caché de la API de Evolution (cuando marca open pero el socket está cerrado)
    if (isActuallyConnected) {
      try {
        const listRes = await fetch(`${cleanUrl}/instance/fetchInstances`, {
          headers: { 'apikey': EVOLUTION_API_KEY },
          signal: AbortSignal.timeout(5000) // Timeout de 5s para evitar que cuelgue
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          const thisInst = listData.find((i: any) => i.name === slug || i.instanceName === slug);
          if (thisInst) {
            if (thisInst.disconnectionReasonCode || thisInst.disconnectionAt || thisInst.connectionStatus !== 'open') {
              console.log(`[EVO-CHECK] ⚠️ Instancia '${slug}' detectada como desvinculada físicamente (${thisInst.disconnectionReasonCode}). Forzando reconexión.`);
              isActuallyConnected = false;
            }
          }
        }
      } catch (err: any) {
        // Si el timeout expira o hay error, asumimos que la conexión inicial es correcta
        console.warn('[EVO-CHECK] Error/timeout al re-verificar con fetchInstances:', err.message || err);
      }
    }

    if (isActuallyConnected) {
      return NextResponse.json({ status: 'connected', stateData });
    }

    // Si está creada pero desconectada (ej. sesión cerrada o no escaneado), pedimos el QR de nuevo
    console.log(`[EVO-CHECK] Solicitando nuevo código QR de conexión para la instancia '${instanceName}'`);
    const qrResponse = await fetch(`${cleanUrl}/instance/connect/${instanceName}`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    
    if (qrResponse.ok) {
      const qrData = await qrResponse.json();
      return NextResponse.json({ 
        status: 'qr', 
        qr: qrData.base64 || qrData.qrcode, 
        message: 'Escanea el código QR para conectar' 
      });
    } else {
      // Si la API falla al dar el QR, forzamos un logout y reiniciamos
      return NextResponse.json({ status: 'disconnected', message: 'Desconectado, intenta de nuevo' });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Falta slug' }, { status: 400 });

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
    const cleanUrl = EVOLUTION_API_URL!.endsWith('/') ? EVOLUTION_API_URL!.slice(0, -1) : EVOLUTION_API_URL;
    const instanceName = encodeURIComponent(slug);

    await fetch(`${cleanUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': EVOLUTION_API_KEY! }
    });
    
    return NextResponse.json({ success: true, message: 'Desconectado' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
