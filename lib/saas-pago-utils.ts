/**
 * Construye el bloque de medios de pago para los mensajes de cobranza SaaS.
 * Solo incluye los métodos que estén efectivamente configurados (no vacíos).
 * Si ningún método está configurado, devuelve un texto de aviso.
 */
export function buildBloquePago(config: any): string {
  if (!config) return '• (Sin métodos de pago configurados — visitar /admin/configuracion)';

  let extra: any = {};
  if (typeof config.mensaje_cobro === 'string' && config.mensaje_cobro) {
    try {
      extra = JSON.parse(config.mensaje_cobro);
    } catch (e) {}
  } else if (typeof config.mensaje_cobro === 'object' && config.mensaje_cobro !== null) {
    extra = config.mensaje_cobro;
  } else if (typeof config === 'object') {
    extra = config;
  }

  const nequi = (config.saas_nequi || config.nequi || extra?.saas_nequi || extra?.nequi || '') + '';
  const daviplata = (config.saas_daviplata || config.daviplata || extra?.saas_daviplata || extra?.daviplata || '') + '';
  const breB = (config.saas_bre_b || config.bre_b || extra?.saas_bre_b || extra?.bre_b || '') + '';
  const bancolombia = (config.saas_bancolombia || config.bancolombia || extra?.saas_bancolombia || extra?.bancolombia || extra?.banco_numero || '') + '';

  const lineas: string[] = [];
  if (nequi.trim()) lineas.push(`• Nequi: *${nequi.trim()}*`);
  if (daviplata.trim()) lineas.push(`• Daviplata: *${daviplata.trim()}*`);
  if (breB.trim()) lineas.push(`• Llave Bre-B / Transfiya: *${breB.trim()}*`);
  if (bancolombia.trim()) lineas.push(`• Bancolombia: *${bancolombia.trim()}*`);

  return lineas.length > 0
    ? lineas.join('\n')
    : '• (Sin métodos de pago configurados — visitar /admin/configuracion)';
}
