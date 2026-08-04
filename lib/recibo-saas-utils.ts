import jsPDF from 'jspdf';
import { mcmLogoBase64 } from '@/lib/mcm-logo-base64';

/**
 * Genera un PDF Élite de recibo MCM SaaS en formato Base64 para el cobro a clubes clientes
 */
export async function generarReciboSaaSPDFBase64(datos: {
  clubNombre: string;
  clubDocumento?: string;
  clubTelefono?: string;
  mesCobrado: string; // e.g. "Julio 2026"
  cantidadJugadores: number;
  montoTotal: number;
  consecutivo: string | number;
  metodoPago?: string;
  fechaPago?: string;
  tipoRecibo?: 'cobro' | 'pago'; // 'cobro' (Cuenta de Cobro) o 'pago' (Comprobante de Pago)
}) {
  const doc = new jsPDF();
  
  // Determinar si es cobro o pago
  const esPago = datos.tipoRecibo ? datos.tipoRecibo === 'pago' : !!datos.metodoPago;
  
  // Colores de Marca MCM / Gibbor
  const verdeMCM = [34, 197, 94]; // #22c55e (Verde Pago)
  const naranjaCobro = [249, 115, 22]; // #f97316 (Naranja Cobro)
  const statusColor = esPago ? verdeMCM : naranjaCobro;

  const slate900 = [15, 23, 42];
  const slate700 = [51, 65, 85];
  const slate500 = [100, 116, 139];
  const slate100 = [241, 245, 249];

  const fechaEmision = datos.fechaPago ? new Date(datos.fechaPago.split('T')[0] + 'T12:00:00') : new Date();

  // 1. ENCABEZADO PRINCIPAL (BANNER OSCURO)
  doc.setFillColor(slate900[0], slate900[1], slate900[2]);
  doc.rect(0, 0, 210, 42, 'F');
  
  // Badge de Estado (PAGO CONFIRMADO / CUENTA DE COBRO)
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.rect(140, 0, 70, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(esPago ? 'PAGO CONFIRMADO' : 'CUENTA DE COBRO', 175, 22, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const subLabel = esPago 
    ? `VÍA: ${(datos.metodoPago || 'TRANSFERENCIA').toUpperCase()}`
    : 'PENDIENTE DE PAGO';
  doc.text(subLabel, 175, 28, { align: 'center' });

  // Renderizado del Logo Oficial de MCM
  let logoCargado = false;
  if (mcmLogoBase64 && mcmLogoBase64.startsWith('data:')) {
    try {
      doc.addImage(mcmLogoBase64, 'PNG', 12, 9, 42, 24);
      logoCargado = true;
    } catch (e) {
      logoCargado = false;
    }
  }

  if (!logoCargado) {
    doc.setFillColor(verdeMCM[0], verdeMCM[1], verdeMCM[2]);
    doc.roundedRect(15, 9, 24, 24, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('MCM', 27, 24, { align: 'center' });
  }

  // Título e Identidad MCM
  const titleX = logoCargado ? 58 : 45;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text('MASTER CLUB MANAGER', titleX, 20);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text('Plataforma Tecnológica de Gestión Deportiva SaaS', titleX, 26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(163, 230, 53); // #a3e635 (Verde Limo)
  doc.text(`Comprobante Oficial: #${String(datos.consecutivo).padStart(4, '0')}`, titleX, 32);


  // 2. INFORMACIÓN DEL CLUB CLIENTE
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text('INFORMACIÓN DEL CLIENTE (ACADEMIA / CLUB)', 15, 54);
  
  doc.setDrawColor(verdeMCM[0], verdeMCM[1], verdeMCM[2]);
  doc.setLineWidth(0.6);
  doc.line(15, 56, 35, 56);

  // Caja contenedora de datos del cliente
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.roundedRect(15, 60, 180, 32, 3, 3, 'F');

  // --- COLUMNA IZQUIERDA ---
  doc.setFontSize(7);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.setFont("helvetica", "normal");
  doc.text('NOMBRE DEL CLUB / ACADEMIA:', 20, 68);
  doc.text('TELÉFONO DE CONTACTO:', 20, 81);

  const nombreClubUpper = (datos.clubNombre || 'CLUB DESCONOCIDO').toUpperCase();
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(nombreClubUpper, 20, 73, { maxWidth: 85 });
  doc.setFontSize(9);
  doc.text(datos.clubTelefono || 'NO REGISTRADO', 20, 86, { maxWidth: 85 });

  // --- COLUMNA DERECHA ---
  doc.setFontSize(7);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.setFont("helvetica", "normal");
  doc.text('NIT / DOCUMENTO LEGAL:', 115, 68);
  doc.text('FECHA DE PAGO:', 115, 81);

  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(datos.clubDocumento || 'NO REGISTRADO', 115, 73);
  doc.text(fechaEmision.toLocaleDateString('es-CO'), 115, 86);


  // 3. TABLA DE CONCEPTOS
  const tableY = 104;
  doc.setFillColor(slate900[0], slate900[1], slate900[2]);
  doc.rect(15, tableY, 180, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text('DESCRIPCIÓN DEL CONCEPTO', 20, tableY + 6.5);
  doc.text('ATLETAS', 135, tableY + 6.5, { align: 'center' });
  doc.text('TOTAL', 185, tableY + 6.5, { align: 'right' });

  // Fila de concepto principal
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Suscripción Plataforma SaaS - Periodo ${datos.mesCobrado}`, 20, tableY + 18);
  doc.text(`${datos.cantidadJugadores} Activos`, 135, tableY + 18, { align: 'center' });
  
  doc.setFont("helvetica", "bold");
  doc.text(`$ ${datos.montoTotal.toLocaleString('es-CO')}`, 185, tableY + 18, { align: 'right' });

  // Línea de separación
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(15, tableY + 26, 195, tableY + 26);

  // Cuadro del Total Final
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.rect(125, tableY + 28, 70, 14, 'F');
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(slate700[0], slate700[1], slate700[2]);
  doc.text(esPago ? 'TOTAL PAGADO:' : 'TOTAL A PAGAR:', 128, tableY + 37);
  doc.setFontSize(11);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(`$ ${datos.montoTotal.toLocaleString('es-CO')}`, 192, tableY + 37, { align: 'right' });


  // 4. FIRMA Y SELLO OFICIAL MASTER CLUB MANAGER
  const footerY = tableY + 60;
  
  // Sello izquierdo MCM
  doc.setDrawColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setLineWidth(0.5);
  doc.line(15, footerY, 70, footerY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text('DEPARTAMENTO FINANCIERO MCM', 42.5, footerY + 5, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('Master Club Manager SaaS', 42.5, footerY + 9, { align: 'center' });

  // Sello derecho Cliente
  doc.setDrawColor(slate900[0], slate900[1], slate900[2]);
  doc.line(140, footerY, 195, footerY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text('CONFIRMACIÓN DEL CLIENTE', 167.5, footerY + 5, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(nombreClubUpper, 167.5, footerY + 9, { align: 'center' });


  // 5. PIE DE PÁGINA DIGITAL
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  const footerDocText = esPago
    ? 'Este documento es un comprobante de pago oficial generado electrónicamente por Master Club Manager.'
    : 'Este documento es una cuenta de cobro oficial generada electrónicamente por Master Club Manager.';
  doc.text(footerDocText, 105, 275, { align: 'center' });
  
  doc.setFont("helvetica", "bold");
  doc.text('Master Club Manager SaaS © 2026 • Impulsando el deporte con tecnología', 105, 280, { align: 'center' });

  // 6. Salida limpia a Base64 sin btoa binary DOMException crash
  return doc.output('datauristring').split(',')[1];
}
