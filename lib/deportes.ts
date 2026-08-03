export interface PosicionInfo {
  id: string;
  nombre: string;
  abreviatura: string;
  deporte: string;
  esGuardameta?: boolean;
}

export const POSICIONES_FUTSAL: PosicionInfo[] = [
  { id: 'Arquero', nombre: 'Arquero / Portero', abreviatura: 'ARQ', deporte: 'Fútsal', esGuardameta: true },
  { id: 'Cierre', nombre: 'Cierre (Líbero/Defensa)', abreviatura: 'CIE', deporte: 'Fútsal' },
  { id: 'Ala', nombre: 'Ala (Izquierda/Derecha)', abreviatura: 'ALA', deporte: 'Fútsal' },
  { id: 'Pivot', nombre: 'Pívot (Atacante)', abreviatura: 'PIV', deporte: 'Fútsal' },
  { id: 'Universal', nombre: 'Universal', abreviatura: 'UNI', deporte: 'Fútsal' },
];

export const POSICIONES_FUTBOL: PosicionInfo[] = [
  { id: 'Portero', nombre: 'Portero / Guardameta', abreviatura: 'POR', deporte: 'Fútbol', esGuardameta: true },
  { id: 'Defensa', nombre: 'Defensa Central', abreviatura: 'DEF', deporte: 'Fútbol' },
  { id: 'Lateral', nombre: 'Lateral', abreviatura: 'LAT', deporte: 'Fútbol' },
  { id: 'Mediocampista', nombre: 'Mediocampista / Volante', abreviatura: 'MED', deporte: 'Fútbol' },
  { id: 'Extremo', nombre: 'Extremo', abreviatura: 'EXT', deporte: 'Fútbol' },
  { id: 'Delantero', nombre: 'Delantero', abreviatura: 'DEL', deporte: 'Fútbol' },
];

export const POSICIONES_TODAS: PosicionInfo[] = [
  ...POSICIONES_FUTSAL,
  ...POSICIONES_FUTBOL
];

/**
 * Retorna si la posición corresponde a un guardameta (Portero / Arquero)
 */
export function esPosicionGuardameta(posicion?: string | null): boolean {
  if (!posicion) return false;
  const p = posicion.trim().toLowerCase();
  return (
    p === 'portero' || 
    p === 'arquero' || 
    p === 'guardameta' || 
    p === 'por' || 
    p === 'arq'
  );
}

/**
 * Retorna la abreviatura corta de la posición para badges de UI
 */
export function getAbreviaturaPosicion(posicion?: string | null): string {
  if (!posicion) return 'VAR';
  const p = posicion.trim();
  const lower = p.toLowerCase();

  if (lower.includes('arquero') || lower === 'arq') return 'ARQ';
  if (lower.includes('cierre') || lower === 'cie') return 'CIE';
  if (lower.includes('ala')) return 'ALA';
  if (lower.includes('pivot') || lower.includes('pívot') || lower === 'piv') return 'PIV';
  if (lower.includes('universal') || lower === 'uni') return 'UNI';

  if (lower.includes('portero') || lower === 'por' || lower.includes('guardameta')) return 'POR';
  if (lower.includes('defensa') || lower === 'def') return 'DEF';
  if (lower.includes('lateral') || lower === 'lat') return 'LAT';
  if (lower.includes('mediocampista') || lower.includes('volante') || lower === 'med') return 'MED';
  if (lower.includes('extremo') || lower === 'ext') return 'EXT';
  if (lower.includes('delantero') || lower === 'del') return 'DEL';

  return p.substring(0, 3).toUpperCase();
}
