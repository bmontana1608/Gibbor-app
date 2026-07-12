import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { history, leadName } = await request.json();

    if (!history || !Array.isArray(history)) {
      return NextResponse.json({ error: 'Faltan parámetros o formato incorrecto' }, { status: 400 });
    }

    // Obtener Clave de Gemini desde configuracion_superadmin
    const { data: configData } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('gemini_api_key')
      .eq('id', 1)
      .maybeSingle();

    const GEMINI_API_KEY = configData?.gemini_api_key || process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ 
        reply: "⚠️ No se encontró la clave de la API de Gemini configurada."
      });
    }

    const SYSTEM_PROMPT = `
Eres un experto en ventas SaaS, actuando como el "Copiloto" del equipo comercial de "Master Club Manager" (MCM), una plataforma integral para administrar academias deportivas y clubes de fútbol.

Tu objetivo es leer el historial de conversación reciente con el prospecto (Lead) llamado "${leadName || 'Cliente'}" y sugerirle al vendedor la MEJOR respuesta posible para enviar.

REGLAS DE VENTA:
1. Habla SIEMPRE desde la solución al dolor (ej: ahorrar tiempo, cobrar a tiempo, profesionalizar el club, mejorar comunicación con padres) y NO solo listando módulos de software (ej: "tenemos módulo de cobranza").
2. Tu meta es cerrar la venta o acercarte al cierre exponiendo beneficios claros.
3. Mantén un tono formal pero cercano y empático con las necesidades del cliente.
4. Si en el historial notas que el cliente está dudoso, rebelde o no entiende bien el valor, sugiere AGENDAR UNA REUNIÓN POR GOOGLE MEET para hacerle una demostración en vivo de la plataforma.
5. Da respuestas listas para copiar y pegar (no digas "Puedes decirle esto: ", simplemente escribe el mensaje final).
6. Usa lenguaje natural de WhatsApp (puedes usar 1 o 2 emojis relevantes, párrafos cortos). No seas robótico.
7. Master Club Manager incluye funciones como: Recaudos automáticos, control de asistencia, cartas FIFA para jugadores, convocatorias digitales por WhatsApp, y vitrina de talento.
`;

    // Format history for Gemini
    const chatContext = history.map((msg: any) => 
      `${msg.es_saliente ? 'VENDEDOR' : 'CLIENTE'}: ${msg.mensaje}`
    ).join('\n\n');

    const promptText = `
HISTORIAL DE CONVERSACIÓN RECIENTE:
${chatContext}

Teniendo en cuenta el historial anterior y las reglas de venta, redacta la respuesta ideal que el VENDEDOR debe enviarle al CLIENTE ahora:
`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: promptText }] }
        ],
        systemInstruction: {
          role: "system",
          parts: [{ text: SYSTEM_PROMPT }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json({ reply: 'Error al generar la respuesta con la IA.' }, { status: 500 });
    }

    const data = await res.json();
    let botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Limpiar comillas si la IA decide envolver el mensaje
    botReply = botReply.replace(/^"|"$/g, '').trim();

    return NextResponse.json({ reply: botReply });

  } catch (error: any) {
    console.error('Error in AI Copilot:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
