import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { history, leadName, intent } = await request.json();

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

    let intentInstruction = 'Tu objetivo es leer el historial de conversación reciente y sugerir la MEJOR respuesta posible para enviar.';
    if (intent === 'demo') {
      intentInstruction = 'Tu objetivo principal es convencer al cliente de AGENDAR UNA DEMOSTRACIÓN (Demo) en vivo (Google Meet o presencial). Resalta que en 15 minutos verá cómo solucionar su mayor dolor administrativo.';
    } else if (intent === 'objection') {
      intentInstruction = 'Tu objetivo principal es IDENTIFICAR LA ÚLTIMA OBJECIÓN del cliente (precio, tiempo, ya usan Excel, etc.) y REFUTARLA amablemente, demostrando que MCM es una inversión que se paga sola (ahorro de tiempo y recuperación de cartera).';
    }

    const SYSTEM_PROMPT = `
Eres un experto en ventas B2B SaaS, actuando como el "Copiloto IA" de un embajador de ventas de "Master Club Manager" (MCM).
MCM es el "sistema operativo para escuelas de fútbol". Centraliza toda la operación: cobros automáticos, asistencia desde la cancha, evaluaciones deportivas y comunicación con padres (cero grupos de WhatsApp).

${intentInstruction}

REGLAS DE VENTA MCM:
1. No vendemos "un software", vendemos organización, tiempo libre para el director y control total del club.
2. Ataca al enemigo: Excel, cuadernos, planillas de papel, y el caos de los grupos de WhatsApp.
3. Habla desde la solución al dolor. Si dicen que los papás no pagan, háblales de los recordatorios de recaudo automático de MCM.
4. Mantén un tono casual, humano, pero súper profesional y empático.
5. Usa lenguaje natural de WhatsApp (párrafos cortos, 1 o 2 emojis). No suenes como un robot corporativo.
6. Da una respuesta lista para copiar y pegar. NO incluyas introducciones como "Puedes responder esto:".
7. Dirígete al cliente por su nombre: "${leadName || 'Director'}".
`;

    // Format history for Gemini
    const chatContext = history.map((msg: any) => 
      `${msg.es_saliente ? 'VENDEDOR (MCM)' : 'CLIENTE'}: ${msg.mensaje}`
    ).join('\n\n');

    const promptText = `
HISTORIAL DE CONVERSACIÓN RECIENTE:
${chatContext}

Teniendo en cuenta el historial anterior y las reglas de venta, redacta la respuesta ideal que el VENDEDOR debe enviarle al CLIENTE ahora:
`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
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
