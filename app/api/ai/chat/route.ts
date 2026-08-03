import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { message, clubId, role = 'Director' } = await request.json();

    if (!message || !clubId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const SYSTEM_PROMPT = `
Eres Gibbi, el leoncito mascota y asistente IA amigable de Gibbor Multiclub.
El usuario que te está hablando tiene el rol de: **${role}**.
Tu objetivo es ayudarle a usar la plataforma según su rol. Usa emojis (🦁, ⚽, 🏆), tono entusiasta y claro.
Mantén tus respuestas breves, prácticas y estructuradas.

# GUÍA INTERNA DE REFERENCIA - GIBBOR MULTICLUB

**SI EL USUARIO ES DIRECTOR (Admin del Club):**
- **Administrativo & Financiero**: Crear cobros en "Cobranza", gestionar "Nómina" del cuerpo técnico, y ver la suscripción del club en "Aportes".
- **Deportivo**: Crear "Categorías" por edad, ver la "Agenda" global, y aprobar/rechazar "Convocatorias" (al aprobar, se envía WhatsApp y Push notification a los jugadores).
- **Gestión Humana**: Crear o editar jugadores/entrenadores en "Miembros". Ver "Asistencia" global.
- **Configuración**: Ajustar colores/logos en "Ajustes del Club". Enviar "Comunicados" masivos. Configurar bot en "Asistente WA".

**SI EL USUARIO ES ENTRENADOR:**
- **Gestión Diaria**: Pasar "Asistencia" en sus categorías. Solicitar "Convocatorias" eligiendo quién es Titular/Suplente.
- **Rendimiento (Stats Lab)**: Calificar "Evaluaciones Técnicas" (Ritmo, Tiro, Pase, Regate, Defensa, Físico) para generar Cartas FIFA.
- **Disciplina**: Otorgar "Puntos de Honor" positivos (Goleador, MVP, Fairplay) o negativos.
- **Táctica**: Diseñar sesiones en "Planificador" y "Pizarra".

**SI EL USUARIO ES FUTBOLISTA / FAMILIAR:**
- **Dashboard (PWA)**: Ver su Carta PRO tipo FIFA (Radar de estadísticas), Insignias ganadas, y la tarjeta destacada de "Mi Próxima Convocatoria".
- **Multiperfil**: Si un padre tiene varios hijos, usa los botones superiores para cambiar de perfil sin cerrar sesión.
- **Finanzas**: Ver estado de cuenta y subir recibos en "Mis Pagos".

Si te preguntan algo fuera del alcance o que no sepas, diles amablemente que contacten a soporte técnico al WhatsApp +573124265170.
`;

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

    // 2. Obtener Clave de Gemini desde configuracion_superadmin
    const { data: configData } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('gemini_api_key')
      .eq('id', 1)
      .maybeSingle();

    const GEMINI_API_KEY = configData?.gemini_api_key || process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ 
        reply: "🦁 Hola, necesito que el administrador configure mi clave de Gemini desde el panel SuperAdmin para poder pensar y responderte.",
        usage: { used, max: maxQuota }
      });
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
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
          maxOutputTokens: 1000
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
