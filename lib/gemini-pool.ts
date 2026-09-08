import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Obtiene el pool de hasta 10 claves de API de Gemini configuradas globalmente.
 * Busca en:
 * 1. configuracion_superadmin (columna gemini_api_keys - array/json)
 * 2. configuracion_superadmin (columna gemini_api_key - string)
 * 3. Variables de entorno (GEMINI_API_KEYS separadas por comas, GEMINI_API_KEY)
 */
export async function getGeminiPool(): Promise<string[]> {
  const keysSet = new Set<string>();

  // 1 y 2. Consultar Base de Datos (SuperAdmin)
  try {
    const { data: config } = await supabaseAdmin
      .from('configuracion_superadmin')
      .select('gemini_api_key, gemini_api_keys')
      .eq('id', 1)
      .maybeSingle();

    if (config) {
      // Si hay array o json de claves
      if (Array.isArray(config.gemini_api_keys)) {
        config.gemini_api_keys.forEach((k: any) => {
          if (typeof k === 'string' && k.trim()) keysSet.add(k.trim());
        });
      } else if (typeof config.gemini_api_keys === 'string') {
        try {
          const parsed = JSON.parse(config.gemini_api_keys);
          if (Array.isArray(parsed)) {
            parsed.forEach((k: any) => {
              if (typeof k === 'string' && k.trim()) keysSet.add(k.trim());
            });
          }
        } catch {
          // Si vino separado por comas o saltos de línea
          config.gemini_api_keys.split(/[\n,]+/).forEach((k: string) => {
            if (k.trim()) keysSet.add(k.trim());
          });
        }
      }

      // Clave individual única histórica
      if (config.gemini_api_key && typeof config.gemini_api_key === 'string' && config.gemini_api_key.trim()) {
        keysSet.add(config.gemini_api_key.trim());
      }
    }
  } catch (err) {
    console.warn('[GeminiPool] No se pudo consultar configuracion_superadmin:', err);
  }

  // 3. Variables de Entorno Globales
  if (process.env.GEMINI_API_KEYS) {
    process.env.GEMINI_API_KEYS.split(',').forEach(k => {
      if (k.trim()) keysSet.add(k.trim());
    });
  }

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    keysSet.add(process.env.GEMINI_API_KEY.trim());
  }

  // Limitar a máximo 10 claves
  return Array.from(keysSet).slice(0, 10);
}

export interface CallGeminiOptions {
  contents: any[];
  systemInstruction?: {
    role?: string;
    parts: { text: string }[];
  };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

/**
 * Ejecuta una llamada a Gemini rotando inteligentemente entre las claves configuradas.
 * Si una clave se agota (código 429 o cuota excedida), pasa automáticamente a la siguiente.
 */
export async function callGeminiWithRotation(
  options: CallGeminiOptions,
  preferredModel: string = 'gemini-2.5-flash'
): Promise<{ text: string; keyIndexUsed: number; totalKeys: number }> {
  const keys = await getGeminiPool();

  if (keys.length === 0) {
    throw new Error(
      'No hay claves de Gemini API configuradas. El SuperAdmin debe agregar al menos una clave en Ajustes > Inteligencia Artificial.'
    );
  }

  const modelsToTry = [preferredModel, 'gemini-1.5-flash', 'gemini-flash-latest'];
  let ultimoError: any = null;

  // Intentar con cada clave disponible en el pool
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: options.contents,
            systemInstruction: options.systemInstruction,
            generationConfig: options.generationConfig
          })
        });

        const data = await res.json();

        // Si la respuesta no es OK
        if (!res.ok) {
          const errMsg = data.error?.message || `HTTP ${res.status}`;
          const isQuota = 
            res.status === 429 || 
            errMsg.includes('RESOURCE_EXHAUSTED') || 
            errMsg.toLowerCase().includes('quota') || 
            errMsg.toLowerCase().includes('rate limit');

          if (isQuota) {
            console.warn(`[GeminiPool] Clave #${i + 1}/${keys.length} agotó su cuota (${errMsg}). Rotando a la siguiente...`);
            ultimoError = new Error(`Clave #${i + 1} agotada: ${errMsg}`);
            break; // Romper el loop de modelos para esta clave y pasar a la siguiente clave
          }

          // Si el modelo no existe o dio error temporal, intentar con el siguiente modelo de esta clave
          console.warn(`[GeminiPool] Error con modelo ${model} en clave #${i + 1}: ${errMsg}. Probando fallback...`);
          ultimoError = new Error(errMsg);
          continue;
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!reply) {
          throw new Error('Gemini respondió sin contenido.');
        }

        // Éxito con esta clave
        return {
          text: reply,
          keyIndexUsed: i,
          totalKeys: keys.length
        };

      } catch (err: any) {
        ultimoError = err;
        // Si fue error de red/fetch en esta clave, intentamos con la siguiente
        console.warn(`[GeminiPool] Fallo en intento con clave #${i + 1}:`, err.message);
        break;
      }
    }
  }

  // Si todas las claves del pool fallaron
  throw new Error(
    `Todas las claves de Gemini (${keys.length}) fallaron o agotaron su cuota. Último error: ${ultimoError?.message || 'Desconocido'}`
  );
}
