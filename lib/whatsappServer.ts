import { supabase } from './supabase';
import { formatInternationalWhatsAppPhone } from './phone-utils';

export async function enviarMensajeWhatsAppServer(
  telefono: string, 
  mensaje: string, 
  mediaBase64?: string, 
  tipoMedia: 'document' | 'image' = 'document',
  fileName: string = 'Archivo.pdf',
  instanceName?: string,
  pais?: string
) {
  try {
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error('Faltan variables de entorno EVOLUTION_API_URL o EVOLUTION_API_KEY');
    }

    if (!instanceName) {
      throw new Error('No se especificó la instancia de WhatsApp correspondiente al club.');
    }

    let finalPhone = formatInternationalWhatsAppPhone(telefono, pais);

    const cleanUrl = EVOLUTION_API_URL.endsWith('/') ? EVOLUTION_API_URL.slice(0, -1) : EVOLUTION_API_URL;
    const instance = encodeURIComponent(instanceName);

    let instanceReady = false;
    try {
      const statusRes = await fetch(`${cleanUrl}/instance/connectionState/${instance}`, {
        headers: { 'apikey': EVOLUTION_API_KEY }
      });
      const statusData = await statusRes.json();
      const rawState = statusData?.instance?.state || statusData?.state || 'disconnected';
      let isActuallyConnected = rawState === 'open';

      if (isActuallyConnected) {
        instanceReady = true;
      }
    } catch (e) {}

    if (!instanceReady) {
      throw new Error(`El canal de WhatsApp del club (${instanceName}) no está conectado o configurado. Por favor vincula tu WhatsApp en Configuración > Asistente WhatsApp.`);
    }

    const endpoint = mediaBase64 ? 'sendMedia' : 'sendText';
    const url = `${cleanUrl}/message/${endpoint}/${instance}`;
    
    let body: any = { number: finalPhone };

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
      } catch (e) {}
      throw new Error(errorDetail || response.statusText);
    }

    const data = await response.json();

    // Persistencia
    try {
      const { data: club } = await supabase
        .from('clubes')
        .select('id')
        .eq('slug', instanceName)
        .single();

      const logBase = {
        destinatario_numero: finalPhone,
        mensaje_texto: mensaje,
        tipo_mensaje: mediaBase64 ? 'Recibo' : (mensaje.includes('Pago') || mensaje.includes('pago') ? 'Cobranza' : 'Notificación'),
        estado: 'enviado',
        instancia: instance,
        club_id: club?.id,
        created_at: new Date().toISOString()
      };

      await supabase.from('mensajes_wa').insert([logBase]);
    } catch(err) {
      console.error('Error guardando historial', err);
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('API WhatsApp Server Error:', error);
    return { success: false, error: error.message };
  }
}
