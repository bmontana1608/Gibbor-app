import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Definir el prompt del sistema (El Manual de Gibbor)
const SYSTEM_PROMPT = `
Eres Gibbi, el asistente IA amigable de Gibbor Multiclub. Eres un leoncito virtual.
Tu objetivo es ayudar a directores, entrenadores y jugadores a usar la plataforma Gibbor Multiclub.
Usa emojis, tono entusiasta y claro.
Respuestas cortas y al grano.

# MANUAL DE GIBBOR MULTICLUB
- **Crear un jugador**: Módulo Miembros -> Nuevo Miembro -> Rol: Futbolista.
- **Cobrar mensualidades**: Módulo Cobranza -> Crear Cobro Global o Individual.
- **Configurar Colores/Logo**: Módulo Configuración -> Identidad Visual.
- **Categorías**: Sirven para organizar a los jugadores por edades. Módulo Categorías.
- **Asistencia**: Módulo Asistencia, seleccionas la fecha y la categoría para pasar lista.
- **Uniformes**: Módulo Uniformes para registrar las entregas de dotación.
- **WhatsApp**: La plataforma cuenta con un robot de WhatsApp (Módulo Configuración -> WhatsApp) para enviar notificaciones automáticas de cobros y comunicados.

Si te preguntan algo que no sepas, diles que contacten a soporte técnico al WhatsApp +573124265170.
`;

export async function POST(request: Request) {
  try {
    const { message, clubId } = await request.json();

    if (!message || !clubId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    // 1. Verificar Cuota Mensual
    let used = 0;
    const maxQuota = 20;

    const { data: clubData, error: clubError } = await supabaseAdmin
      .from('clubes')
      .select('ia_mensajes_mes, ia_ultimo_reset')
      .eq('id', clubId)
      .maybeSingle();

    if (clubError) {
      console.warn("Error leyendo cuota de IA (Puede que la columna no exista aún):", clubError.message);
    }

    if (clubData) {
      const lastReset = clubData.ia_ultimo_reset ? new Date(clubData.ia_ultimo_reset) : new Date(0);
      const now = new Date();
      
      // Resetear si es un mes diferente
      if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
        await supabaseAdmin.from('clubes').update({
          ia_mensajes_mes: 0,
          ia_ultimo_reset: now.toISOString()
        }).eq('id', clubId);
        used = 0;
      } else {
        used = clubData.ia_mensajes_mes || 0;
      }
    }

    if (used >= maxQuota) {
      return NextResponse.json({ 
        reply: "🦁 ¡Roar! Parece que hemos superado el límite de 20 consultas mágicas por este mes para tu club. No te preocupes, puedes seguir usando los botones de configuración rápida o contactar al soporte técnico humano en WhatsApp al +573124265170.",
        usage: { used, max: maxQuota }
      });
    }

    // 2. Llamada a Gemini
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ 
        reply: "🦁 Hola, necesito que el administrador configure mi clave de Gemini (GEMINI_API_KEY) para poder pensar y responderte.",
        usage: { used, max: maxQuota }
      });
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: message }] }
        ],
        systemInstruction: {
          role: "system",
          parts: [{ text: SYSTEM_PROMPT }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 250
        }
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Error en Gemini API');
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude entender eso.";

    // 3. Actualizar Cuota
    await supabaseAdmin.from('clubes').update({
      ia_mensajes_mes: used + 1,
      ia_ultimo_reset: new Date().toISOString()
    }).eq('id', clubId);

    return NextResponse.json({ 
      reply,
      usage: { used: used + 1, max: maxQuota }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
