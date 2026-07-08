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
  fileName: string = 'Archivo_Gibbor.pdf',
  tenantSlug?: string
) {
  try {
    // 2. Limpieza y formateo del número
    let finalPhone = String(telefono).replace(/\D/g, '');
    if (finalPhone.length === 10) {
      finalPhone = `57${finalPhone}`;
    }

    // Identificar tenant slug
    let instanceName = tenantSlug || 'gibbor';
    
    if (!tenantSlug && typeof window !== 'undefined') {
      const host = window.location.host;
      const parts = host.split('.');
      
      // Detección por subdominio
      if (parts.length > 2 && parts[0] !== 'www') {
        instanceName = parts[0] === 'portalgibbor' ? 'gibbor' : parts[0];
      } else {
        // Detección por ruta
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const reservedPaths = ['director', 'entrenador', 'futbolista', 'login', 'perfil', 'api', 'admin', 'master'];
        if (pathParts.length > 0 && !reservedPaths.includes(pathParts[0])) {
          instanceName = pathParts[0];
        }
      }
    }

    const payload = {
      telefono: finalPhone,
      mensaje,
      mediaBase64,
      tipoMedia,
      fileName,
      instanceName
    };

    const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://gibbor-app.vercel.app'));
    const fetchUrl = `${baseUrl}/api/whatsapp/send`;

    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    let result;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const textError = await response.text();
      throw new Error(`Error del servidor (${response.status}): ${textError.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      throw new Error(result.error || 'Error en el servidor de WhatsApp');
    }

    // 4. PERSISTENCIA: Guardar en historial
    // Necesitamos el club_id real para que aparezca en el historial del tenant
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
      instancia: instanceName,
      club_id: club?.id,
      created_at: new Date().toISOString()
    };

    const { error: logError1 } = await supabase.from('mensajes_wa').insert([logBase]);

    if (logError1) {
      console.warn('Log falló:', logError1.message);
      // Intento sin instancia por si falla el schema
      const { error: logError2 } = await supabase.from('mensajes_wa').insert([{
        destinatario_numero: finalPhone,
        mensaje_texto: mensaje,
        tipo_mensaje: logBase.tipo_mensaje,
        estado: 'enviado',
        created_at: logBase.created_at
      }]);
      if (!logError2) console.log('✅ Mensaje guardado (esquema mínimo)');
    } else {
      console.log('✅ Mensaje guardado en historial');
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('WhatsApp Engine Error:', error.message);
    return { success: false, error: error.message };
  }
}
