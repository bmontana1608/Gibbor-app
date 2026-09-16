/**
 * Utilidades para normalización inteligente de números telefónicos internacionales para WhatsApp
 */

interface CountryRule {
  code: string;
  localLength?: number;
  stripLeadingZero?: boolean;
  prefixMobile?: string;
}

const COUNTRY_RULES: Record<string, CountryRule> = {
  colombia: { code: '57', localLength: 10 },
  méxico: { code: '52', localLength: 10 },
  mexico: { code: '52', localLength: 10 },
  argentina: { code: '54', localLength: 10, prefixMobile: '9' },
  perú: { code: '51', localLength: 9 },
  peru: { code: '51', localLength: 9 },
  chile: { code: '56', localLength: 9 },
  ecuador: { code: '593', localLength: 9, stripLeadingZero: true },
  venezuela: { code: '58', localLength: 10, stripLeadingZero: true },
  españa: { code: '34', localLength: 9 },
  espana: { code: '34', localLength: 9 },
  'estados unidos': { code: '1', localLength: 10 },
  usa: { code: '1', localLength: 10 },
  eeuu: { code: '1', localLength: 10 },
  'ee.uu.': { code: '1', localLength: 10 },
  uruguay: { code: '598', localLength: 8, stripLeadingZero: true },
  paraguay: { code: '595', localLength: 9, stripLeadingZero: true },
  bolivia: { code: '591', localLength: 8 },
  panamá: { code: '507', localLength: 8 },
  panama: { code: '507', localLength: 8 },
  'costa rica': { code: '506', localLength: 8 },
  guatemala: { code: '502', localLength: 8 },
  honduras: { code: '504', localLength: 8 },
  'el salvador': { code: '503', localLength: 8 },
  nicaragua: { code: '505', localLength: 8 },
  'república dominicana': { code: '1', localLength: 10 },
  'republica dominicana': { code: '1', localLength: 10 },
  brasil: { code: '55', localLength: 11 },
  brazil: { code: '55', localLength: 11 },
};

/**
 * Normaliza cualquier número de teléfono internacional para WhatsApp
 * teniendo en cuenta prefijos existentes, códigos de país y particularidades locales.
 */
export function formatInternationalWhatsAppPhone(rawPhone: string | number | null | undefined, pais?: string | null): string {
  if (!rawPhone) return '';

  let str = String(rawPhone).trim();
  if (!str) return '';

  const startsWithPlus = str.startsWith('+');
  const startsWithDoubleZero = str.startsWith('00');

  // Si inicia con 00, eliminarlo
  if (startsWithDoubleZero) {
    str = str.slice(2);
  }

  // Extraer solo dígitos
  let digits = str.replace(/\D/g, '');
  if (!digits) return '';

  // Si el usuario ingresó explícitamente con '+' o '00', ya incluye el código de país internacional
  if (startsWithPlus || startsWithDoubleZero) {
    // Caso especial Argentina: +54 debe tener un '9' tras el 54 para WhatsApp mobile si no lo tiene
    if (digits.startsWith('54') && !digits.startsWith('549')) {
      digits = '549' + digits.slice(2);
    }
    return digits;
  }

  // Si se proporcionó un país conocido, intentar aplicar su regla
  const normalizedCountry = pais?.trim().toLowerCase();
  const rule = normalizedCountry ? COUNTRY_RULES[normalizedCountry] : null;

  if (rule) {
    // Si tiene ceros locales al inicio (ej. Ecuador 099..., Venezuela 0414...)
    if (rule.stripLeadingZero && digits.startsWith('0')) {
      digits = digits.replace(/^0+/, '');
    }

    // Verificar si ya empieza con el código de país
    if (digits.startsWith(rule.code)) {
      if (rule.code === '54' && !digits.startsWith('549')) {
        digits = '549' + digits.slice(2);
      }
      return digits;
    }

    // Si requiere prefijo móvil extra (ej. Argentina 9)
    let localDigits = digits;
    if (rule.prefixMobile && !localDigits.startsWith(rule.prefixMobile)) {
      localDigits = rule.prefixMobile + localDigits;
    }

    return `${rule.code}${localDigits}`;
  }

  // Si no hay país especificado, evaluar por estructura general
  // Si ya tiene más de 10 dígitos y empieza por un código conocido
  for (const known of Object.values(COUNTRY_RULES)) {
    if (digits.startsWith(known.code) && digits.length > 9) {
      if (known.code === '54' && !digits.startsWith('549')) {
        digits = '549' + digits.slice(2);
      }
      return digits;
    }
  }

  // Si tiene 10 dígitos y empieza por 3 (característico de celulares colombianos), o por defecto
  if (digits.length === 10) {
    return `57${digits}`;
  }

  return digits;
}

/**
 * Genera el enlace directo para WhatsApp (wa.me)
 */
export function getWhatsAppUrl(rawPhone: string | number | null | undefined, mensaje?: string, pais?: string | null): string {
  const phone = formatInternationalWhatsAppPhone(rawPhone, pais);
  if (!phone) return '#';
  const query = mensaje ? `?text=${encodeURIComponent(mensaje)}` : '';
  return `https://wa.me/${phone}${query}`;
}

/**
 * Formatea visualmente el teléfono con bandera o código para la interfaz
 */
export function getCountryFlag(pais?: string | null): string {
  if (!pais) return '🌐';
  const p = pais.toLowerCase().trim();
  if (p.includes('colombia')) return '🇨🇴';
  if (p.includes('mexic') || p.includes('méxic')) return '🇲🇽';
  if (p.includes('argentina')) return '🇦🇷';
  if (p.includes('peru') || p.includes('perú')) return '🇵🇪';
  if (p.includes('chile')) return '🇨🇱';
  if (p.includes('ecuador')) return '🇪🇨';
  if (p.includes('venezuela')) return '🇻🇪';
  if (p.includes('españa') || p.includes('espana')) return '🇪🇸';
  if (p.includes('estados unidos') || p.includes('usa') || p.includes('eeuu')) return '🇺🇸';
  if (p.includes('uruguay')) return '🇺🇾';
  if (p.includes('paraguay')) return '🇵🇾';
  if (p.includes('bolivia')) return '🇧🇴';
  if (p.includes('costa rica')) return '🇨🇷';
  if (p.includes('panam')) return '🇵🇦';
  if (p.includes('guatemala')) return '🇬🇹';
  if (p.includes('salvador')) return '🇸🇻';
  if (p.includes('honduras')) return '🇭🇳';
  if (p.includes('nicaragua')) return '🇳🇮';
  if (p.includes('dominicana')) return '🇩🇴';
  if (p.includes('brasil')) return '🇧🇷';
  return '🌐';
}
