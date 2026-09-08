import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { prompt, clubId } = await request.json();

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Debes proporcionar una descripción para el formulario.' }, { status: 400 });
    }

    // 1. Obtener clave de Gemini desde configuracion_superadmin o env
    let geminiKey = process.env.GEMINI_API_KEY;
    try {
      const { data: configData } = await supabaseAdmin
        .from('configuracion_superadmin')
        .select('gemini_api_key')
        .eq('id', 1)
        .maybeSingle();

      if (configData?.gemini_api_key) {
        geminiKey = configData.gemini_api_key;
      }
    } catch (err) {
      console.warn('No se pudo consultar configuracion_superadmin:', err);
    }

    if (!geminiKey) {
      return NextResponse.json({
        error: 'No se encontró una clave de Gemini configurada. Por favor configúrala en el panel SuperAdmin o como variable de entorno GEMINI_API_KEY.'
      }, { status: 500 });
    }

    const SYSTEM_PROMPT = 
Eres un generador experto de formularios dinámicos para academias de fútbol y clubes deportivos.
Tu tarea es convertir la descripción del usuario en una estructura JSON exacta para un creador de formularios.

REGLAS DE FORMATO JSON:
Debes responder ÚNICAMENTE un objeto JSON válido con esta estructura:
{
  "titulo": "Título conciso y profesional del formulario",
  "descripcion": "Descripción breve y clara que explique el propósito a quien lo va a llenar",
  "campos": [
    {
      "id": "campo_1",
      "tipo": "text | textarea | number | email | tel | date | select | radio | checkbox | file",
      "label": "Nombre del campo",
      "placeholder": "Texto de ayuda / ejemplo (opcional)",
      "requerido": true | false,
      "opciones": ["Opción 1", "Opción 2"], // SOLO OBLIGATORIO si el tipo es select, radio o checkbox
      "archivoTipos": "imagen | pdf | todos" // SOLO si el tipo es file
    }
  ]
}

TIPOS DE CAMPOS PERMITIDOS:
- "text": Para nombres, apellidos, documento, texto corto.
- "textarea": Para direcciones, observaciones, antecedentes médicos o comentarios largos.
- "number": Para edad, estatura, peso, dorsales.
- "email": Para correos electrónicos.
- "tel": Para teléfonos, WhatsApp, números de contacto.
- "date": Para fechas de nacimiento, fechas de expedición, etc.
- "select": Menú desplegable cuando hay varias opciones claras (ej. tipo de documento, género, categoría, posición de juego).
- "radio": Selección única entre pocas opciones (ej. Sí / No, Jornada Mañana / Tarde).
- "checkbox": Selección múltiple (ej. "Acepto términos y condiciones", alergias múltiples).
- "file": Para adjuntar fotos, carnets, certificados EPS, documentos en PDF o imágenes. Configura "archivoTipos" en "imagen", "pdf" o "todos".

REQUISITOS IMPORTANTES:
1. Asegúrate de incluir TODOS los campos que el usuario solicitó en su petición.
2. Si piden nombres y apellidos, crea campos separados ("Nombres", "Apellidos").
3. Si piden documentos (foto, PDF), usa el tipo "file" y especifica el "archivoTipos".
4. Si piden tipo de documento, usa "select" con opciones colombianas/latinoamericanas: ["Tarjeta de Identidad", "Cédula de Ciudadanía", "Registro Civil", "Pasaporte", "Permiso por Protección Temporal (PPT)"].
5. Haz que los campos fundamentales sean requeridos: true.
6. Devuelve SOLO el JSON sin texto introductorio ni explicaciones.
;

    // 2. Llamada a Gemini con generación JSON
    const model = 'gemini-2.5-flash';
    const fallbackModel = 'gemini-1.5-flash';

    let res = await fetch(https://generativelanguage.googleapis.com/v1beta/models/:generateContent?key=, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: prompt }] }
        ],
        systemInstruction: {
          role: 'system',
          parts: [{ text: SYSTEM_PROMPT }]
        },
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!res.ok) {
      console.warn(Error con , intentando con ...);
      res = await fetch(https://generativelanguage.googleapis.com/v1beta/models/:generateContent?key=, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: prompt }] }
          ],
          systemInstruction: {
            role: 'system',
            parts: [{ text: SYSTEM_PROMPT }]
          },
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        })
      });
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Error al comunicarse con Gemini');
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Gemini no devolvió una respuesta válida');
    }

    // 3. Parsear JSON garantizando que se limpie markdown si viene envuelto
    let parsedForm;
    try {
      const cleanJson = rawText.replace(/`json/gi, '').replace(/`/g, '').trim();
      parsedForm = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Error parseando JSON de Gemini:', rawText);
      throw new Error('La IA generó una estructura que no pudo ser procesada como JSON.');
    }

    // 4. Validar y normalizar IDs de campos
    if (!parsedForm.campos || !Array.isArray(parsedForm.campos)) {
      parsedForm.campos = [];
    }

    parsedForm.campos = parsedForm.campos.map((c: any, index: number) => ({
      id: c.id || campo__,
      tipo: ['text', 'textarea', 'number', 'email', 'tel', 'date', 'select', 'radio', 'checkbox', 'file'].includes(c.tipo) ? c.tipo : 'text',
      label: c.label || Campo ,
      placeholder: c.placeholder || '',
      requerido: Boolean(c.requerido),
      opciones: Array.isArray(c.opciones) ? c.opciones : (['select', 'radio', 'checkbox'].includes(c.tipo) ? ['Opción 1', 'Opción 2'] : undefined),
      archivoTipos: c.archivoTipos || (c.tipo === 'file' ? 'todos' : undefined)
    }));

    return NextResponse.json({
      formulario: {
        titulo: parsedForm.titulo || 'Nuevo Formulario',
        descripcion: parsedForm.descripcion || '',
        campos: parsedForm.campos
      }
    });

  } catch (error: any) {
    console.error('Error en /api/ai/generar-formulario:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
