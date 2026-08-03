/**
 * Construye el bloque de medios de pago para los mensajes de cobranza SaaS.
 * Solo incluye los métodos que estén efectivamente configurados (no vacíos).
 * Si ningún método está configurado, devuelve un texto de aviso.
 */
export function buildBloquePago(config: {
  saas_nequi?: string | null;
  saas_daviplata?: string | null;
  saas_bre_b?: string | null;
  saas_bancolombia?: string | null;
  mensaje_cobro?: string | null;
}): string {
  // Si vienen de mensaje_cobro en JSON (fallback legacy), parsear también
  let extra: any = {};
  if (config.mensaje_cobro) {
    try {
      extra = JSON.parse(config.mensaje_cobro);
    } catch (e) {}
  }

  const nequi      = config.saas_nequi?.trim()      || extra?.saas_nequi?.trim()      || '';
  const daviplata  = config.saas_daviplata?.trim()   || extra?.saas_daviplata?.trim()   || '';
  const breB       = config.saas_bre_b?.trim()       || extra?.saas_bre_b?.trim()       || '';
  const bancolombia = config.saas_bancolombia?.trim() || extra?.saas_bancolombia?.trim() || '';

  const lineas: string[] = [];
  if (nequi)       lineas.push(`• Nequi: *${nequi}*`);
  if (daviplata)   lineas.push(`• Daviplata: *${daviplata}*`);
  if (breB)        lineas.push(`• Llave Bre-B / Transfiya: *${breB}*`);
  if (bancolombia) lineas.push(`• Bancolombia: *${bancolombia}*`);

  return lineas.length > 0
    ? lineas.join('\n')
    : '• (Sin métodos de pago configurados — visitar /admin/configuracion)';
}
