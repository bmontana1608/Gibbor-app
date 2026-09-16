/**
 * Catálogo de países, monedas y códigos de marcado telefónico
 * Utilidad unificada para soporte multi-país y multi-divisa en Gibbor App
 */

export interface CountryInfo {
  code: string;           // Código ISO del país (CO, MX, US, ES, etc.)
  name: string;           // Nombre común en español
  flag: string;           // Emoji bandera
  dialCode: string;       // Prefijo telefónico (+57, +52, +1, +34, etc.)
  currency: string;       // Código de moneda (COP, MXN, USD, EUR, etc.)
  symbol: string;         // Símbolo habitual ($ , €, S/, etc.)
  precioSugerido: number; // Precio mensual base sugerido para un club
  descuentoSugerido: number;
}

export const COUNTRY_CATALOG: CountryInfo[] = [
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', dialCode: '+57', currency: 'COP', symbol: '$', precioSugerido: 70000, descuentoSugerido: 10000 },
  { code: 'MX', name: 'México', flag: '🇲🇽', dialCode: '+52', currency: 'MXN', symbol: '$', precioSugerido: 1200, descuentoSugerido: 200 },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', dialCode: '+1', currency: 'USD', symbol: '$', precioSugerido: 70, descuentoSugerido: 10 },
  { code: 'ES', name: 'España', flag: '🇪🇸', dialCode: '+34', currency: 'EUR', symbol: '€', precioSugerido: 65, descuentoSugerido: 10 },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', dialCode: '+593', currency: 'USD', symbol: '$', precioSugerido: 60, descuentoSugerido: 10 },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', dialCode: '+51', currency: 'PEN', symbol: 'S/', precioSugerido: 250, descuentoSugerido: 40 },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dialCode: '+54', currency: 'ARS', symbol: '$', precioSugerido: 75000, descuentoSugerido: 10000 },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dialCode: '+56', currency: 'CLP', symbol: '$', precioSugerido: 65000, descuentoSugerido: 10000 },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦', dialCode: '+507', currency: 'USD', symbol: '$', precioSugerido: 70, descuentoSugerido: 10 },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', dialCode: '+506', currency: 'CRC', symbol: '₡', precioSugerido: 35000, descuentoSugerido: 5000 },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', dialCode: '+502', currency: 'GTQ', symbol: 'Q', precioSugerido: 500, descuentoSugerido: 80 },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', dialCode: '+503', currency: 'USD', symbol: '$', precioSugerido: 60, descuentoSugerido: 10 },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', dialCode: '+504', currency: 'HNL', symbol: 'L', precioSugerido: 1500, descuentoSugerido: 200 },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', dialCode: '+505', currency: 'NIO', symbol: 'C$', precioSugerido: 2200, descuentoSugerido: 300 },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴', dialCode: '+1', currency: 'DOP', symbol: 'RD$', precioSugerido: 3800, descuentoSugerido: 500 },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', dialCode: '+591', currency: 'BOB', symbol: 'Bs', precioSugerido: 450, descuentoSugerido: 60 },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', dialCode: '+595', currency: 'PYG', symbol: '₲', precioSugerido: 500000, descuentoSugerido: 70000 },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dialCode: '+598', currency: 'UYU', symbol: '$', precioSugerido: 2800, descuentoSugerido: 400 },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', dialCode: '+58', currency: 'USD', symbol: '$', precioSugerido: 50, descuentoSugerido: 10 },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', dialCode: '+55', currency: 'BRL', symbol: 'R$', precioSugerido: 350, descuentoSugerido: 50 },
];

/**
 * Normaliza y busca la información de moneda y país a partir de un nombre o código de país
 */
export function getCountryInfo(countryNameOrCode?: string | null): CountryInfo {
  if (!countryNameOrCode) {
    return COUNTRY_CATALOG[0]; // Por defecto Colombia
  }

  const query = countryNameOrCode.trim().toLowerCase();

  // Buscar coincidencia exacta por código ISO
  const byCode = COUNTRY_CATALOG.find(c => c.code.toLowerCase() === query);
  if (byCode) return byCode;

  // Buscar coincidencia por nombre
  const byName = COUNTRY_CATALOG.find(c => 
    c.name.toLowerCase() === query || 
    query.includes(c.name.toLowerCase()) || 
    c.name.toLowerCase().includes(query)
  );
  if (byName) return byName;

  // Buscar por moneda
  const byCurrency = COUNTRY_CATALOG.find(c => c.currency.toLowerCase() === query);
  if (byCurrency) return byCurrency;

  // Si no se encuentra, buscar por dialCode
  const byDial = COUNTRY_CATALOG.find(c => c.dialCode === countryNameOrCode || c.dialCode.replace('+', '') === countryNameOrCode);
  if (byDial) return byDial;

  return COUNTRY_CATALOG[0]; // Fallback a Colombia
}

/**
 * Retorna la información de divisa para un país dado o código de divisa
 */
export function getCurrencyInfo(countryOrCurrency?: string | null): { code: string; symbol: string; dialCode: string; countryName: string; flag: string } {
  const info = getCountryInfo(countryOrCurrency);
  return {
    code: info.currency,
    symbol: info.symbol,
    dialCode: info.dialCode,
    countryName: info.name,
    flag: info.flag
  };
}

/**
 * Formatea un monto numérico según la divisa y el país especificados
 * Ejemplos:
 *  - formatCurrency(70000, 'Colombia') -> "$ 70.000 COP" o "$ 70.000"
 *  - formatCurrency(1200, 'México') -> "$ 1,200 MXN"
 *  - formatCurrency(65, 'España') -> "65,00 €"
 *  - formatCurrency(70, 'Estados Unidos') -> "$ 70.00 USD"
 */
export function formatCurrency(
  amount: number | null | undefined, 
  countryOrCurrency?: string | null,
  options?: { showCode?: boolean; precision?: number }
): string {
  const val = Number(amount) || 0;
  const country = getCountryInfo(countryOrCurrency);
  const showCode = options?.showCode !== false;

  const noDecimalCurrencies = ['COP', 'CLP', 'PYG'];
  const hasDecimals = !noDecimalCurrencies.includes(country.currency) && (options?.precision !== undefined ? options.precision > 0 : (val % 1 !== 0));

  let formattedNum = '';

  if (country.code === 'ES' || country.currency === 'EUR') {
    formattedNum = val.toLocaleString('es-ES', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    });
    return `${formattedNum} €`;
  }

  const locale = country.code === 'CO' ? 'es-CO' : (country.code === 'MX' ? 'es-MX' : 'en-US');
  formattedNum = val.toLocaleString(locale, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });

  if (showCode) {
    return `${country.symbol} ${formattedNum} ${country.currency}`;
  }
  return `${country.symbol} ${formattedNum}`;
}

/**
 * Normaliza un número telefónico para WhatsApp garantizando el dialCode internacional
 */
export function formatInternationalWhatsAppPhone(phone: string, countryOrDialCode?: string | null): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned.replace('+', '');
  }

  let dial = '+57';
  if (countryOrDialCode) {
    if (countryOrDialCode.startsWith('+')) {
      dial = countryOrDialCode;
    } else {
      dial = getCountryInfo(countryOrDialCode).dialCode;
    }
  }

  const dialDigits = dial.replace('+', '');

  if (cleaned.startsWith(dialDigits) && cleaned.length > dialDigits.length + 6) {
    return cleaned;
  }

  return `${dialDigits}${cleaned}`;
}
