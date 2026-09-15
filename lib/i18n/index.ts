import es from './es.json';
import en from './en.json';

const dictionaries: Record<string, any> = {
  es,
  en
};

/**
 * Función central para resolver traducciones
 * @param key Llave de traducción (ej: "futbolista.dashboard.greeting")
 * @param language Código de idioma (ej: "es", "en")
 * @param params Objeto con parámetros para reemplazar (ej: { name: "Alex" })
 */
export function translate(key: string, language: string = 'es', params?: Record<string, string | number>): string {
  const dict = dictionaries[language] || dictionaries['es'];
  const keys = key.split('.');
  
  let value = dict;
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      value = undefined;
      break;
    }
  }

  // Fallback to Spanish if key not found in target language
  if (value === undefined && language !== 'es') {
    value = dictionaries['es'];
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }
  }

  if (value === undefined || typeof value !== 'string') {
    return key; // return key if not found
  }

  let result = value;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    }
  }

  return result;
}

export * from './LanguageContext';

