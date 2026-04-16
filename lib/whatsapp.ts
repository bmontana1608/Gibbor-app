import { supabase } from './supabase';

/**
 * Motor Centralizado de Mensajería para Evolution API
 * Soporta envío de texto y media (PDF/Imagenes) con persistencia automática en historial.
 */
export async function enviarMensajeWhatsApp(
  telefono: string, 
  mensaje: string, 
  mediaBase64?: string, 
  tipoMedia: 'document' | 'image' = 'document',
  fileName: string = 'Archivo_Gibbor.pdf'
) {
  try {
    // 1. Obtener configuración activa
    const { data: config, error: configError } = await supabase
      .from('configuracion_wa')
      .select('*')
      .single();

    if (configError || !config || !config.api_url || !config.api_key) {
      throw new Error('Configuración de WhatsApp no encontrada o incompleta.');
    }

    // 2. Limpieza y formateo del número (Standardized for Colombia/Global)
    let finalPhone = String(telefono).replace(/\D/g, '');
    if (finalPhone.length === 10) {
      finalPhone = `57${finalPhone}`;
    }

    const cleanUrl = config.api_url.endsWith('/') ? config.api_url.slice(0, -1) : config.api_url;
    const instanceName = encodeURIComponent(config.instance_name || 'Gibbor_App');
    
    // 3. Determinar Endpoint y Body
    const endpoint = mediaBase64 ? 'sendMedia' : 'sendText';
    const url = `${cleanUrl}/message/${endpoint}/${instanceName}`;
    
    // Body base para Texto
    let body: any = {
      number: finalPhone,
    };

    if (mediaBase64) {
      // Body estricto para Multimedia (Sin campos extra que causen 400 Bad Request)
      body = {
        ...body,
        media: mediaBase64,
        mediatype: tipoMedia,
        mimetype: tipoMedia === 'document' ? 'application/pdf' : 'image/png',
        fileName: fileName,
        caption: mensaje
      };
    } else {
      // Body para Texto con extras permitidos
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
        'apikey': config.api_key
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    
    if (!response.ok) {
      let errorBody = '';
      try { errorBody = await response.text(); } catch(_) {}
      console.error('Evolution API error body:', errorBody);
      throw new Error(errorBody || response.statusText || 'Error en el servidor de WhatsApp');
    }

    // 4. PERSISTENCIA: Guardar en historial con fallback progresivo
    const logBase = {
      destinatario_numero: finalPhone,
      mensaje_texto: mensaje,
      tipo_mensaje: mediaBase64 ? 'Recibo' : (mensaje.includes('Pago') || mensaje.includes('pago') ? 'Cobranza' : 'Notificación'),
      estado: 'enviado',
      created_at: new Date().toISOString()
    };

    // Intento 1: Con columna 'instancia'
    const { error: logError1 } = await supabase.from('mensajes_wa').insert([{
      ...logBase,
      instancia: config.instance_name || 'Gibbor_App'
    }]);

    if (logError1) {
      console.warn('Log intento 1 falló:', logError1.message, '— reintentando sin instancia...');
      // Intento 2: Sin columna 'instancia' (esquema mínimo)
      const { error: logError2 } = await supabase.from('mensajes_wa').insert([logBase]);
      if (logError2) {
        console.error('Log intento 2 también falló:', logError2.message);
      } else {
        console.log('✅ Mensaje guardado en historial (esquema mínimo)');
      }
    } else {
      console.log('✅ Mensaje guardado en historial completo');
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error('WhatsApp Engine Error:', error.message);
    return { success: false, error: error.message };
  }
}
