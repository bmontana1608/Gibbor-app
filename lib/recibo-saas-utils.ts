import jsPDF from 'jspdf';
import { mcmLogoBase64 } from '@/lib/mcm-logo-base64';

/**
 * Genera un PDF Élite de recibo Gibbor SaaS en formato Base64 para el cobro a clubes
 */
export async function generarReciboSaaSPDFBase64(datos: {
  clubNombre: string;
  clubDocumento?: string;
  clubTelefono?: string;
  mesCobrado: string; // e.g. "Septiembre 2026"
  cantidadJugadores: number;
  montoTotal: number;
  consecutivo: string | number;
  metodoPago?: string;
  fechaPago?: string; // Fecha en la que se pagó
  fechaVencimiento?: string; // Fecha límite de pago
  estado?: 'PAGADO' | 'PENDIENTE' | 'COBRO';
  canalesPago?: string;
  planNombre?: string;
}) {
  const doc = new jsPDF();
  const esCobro = datos.estado === 'COBRO' || datos.estado === 'PENDIENTE';
  
  // Colores de Marca
  const naranjaGibbor = [249, 115, 22]; // #f97316
  const slate900 = [15, 23, 42];
  const slate500 = [100, 116, 139];
  const slate100 = [241, 245, 249];
  const green = [34, 197, 94];
  const amber = [245, 158, 11];

  // 1. ENCABEZADO Y LOGO
  doc.setFillColor(slate900[0], slate900[1], slate900[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  // Badge de Estado
  if (esCobro) {
    doc.setFillColor(amber[0], amber[1], amber[2]);
    doc.rect(140, 0, 70, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text('CUENTA DE COBRO', 175, 20, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Vence: ${datos.fechaVencimiento || 'Inmediato'}`, 175, 27, { align: 'center' });
  } else {
    doc.setFillColor(green[0], green[1], green[2]);
    doc.rect(140, 0, 70, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text('PAGO CONFIRMADO', 175, 20, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Vía: ${(datos.metodoPago || 'Transferencia').toUpperCase()}`, 175, 27, { align: 'center' });
  }

  // Logo e Identidad (MCM)
  try {
    doc.addImage(mcmLogoBase64, 'PNG', 15, 12, 38, 14);
  } catch (e) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('M', 20, 25);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text('Master Club Manager', 58, 22);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text('Plataforma Tecnológica Deportiva', 58, 28);
  doc.text(`${esCobro ? 'Documento' : 'Comprobante'}: #${String(datos.consecutivo).padStart(4, '0')}`, 58, 33);

  // 3. INFORMACIÓN DEL CLUB CLIENTE
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text('INFORMACIÓN DEL CLIENTE (CLUB)', 15, 55);
  
  doc.setDrawColor(naranjaGibbor[0], naranjaGibbor[1], naranjaGibbor[2]);
  doc.setLineWidth(0.5);
  doc.line(15, 57, 30, 57);

  // Caja de fondo
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.roundedRect(15, 62, 180, 30, 3, 3, 'F');

  // --- COLUMNA IZQUIERDA ---
  doc.setFontSize(7);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.setFont("helvetica", "normal");
  doc.text('NOMBRE DEL CLUB / ACADEMIA:', 20, 70);
  doc.text('TELÉFONO DE CONTACTO:', 20, 82);

  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(datos.clubNombre.toUpperCase(), 20, 75, { maxWidth: 85 });
  doc.text(datos.clubTelefono || 'NO REGISTRADO', 20, 87, { maxWidth: 85 });

  // --- COLUMNA DERECHA ---
  doc.setFontSize(7);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.setFont("helvetica", "normal");
  doc.text('DOCUMENTO / NIT:', 115, 70);
  doc.text(esCobro ? 'FECHA DE EMISIÓN:' : 'FECHA DE PAGO:', 115, 82);

  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(datos.clubDocumento || 'NO REGISTRADO', 115, 75);
  
  const fechaMostrar = datos.fechaPago || new Date().toISOString();
  const fechaObj = new Date(fechaMostrar.split('T')[0] + 'T12:00:00');
  doc.text(fechaObj.toLocaleDateString('es-CO'), 115, 87);

  // 4. TABLA DE CONCEPTOS
  const tableY = 107;
  doc.setFillColor(slate900[0], slate900[1], slate900[2]);
  doc.rect(15, tableY, 180, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('DESCRIPCIÓN DEL CONCEPTO', 20, tableY + 6.5);
  doc.text('CANTIDAD', 120, tableY + 6.5, { align: 'center' });
  doc.text('TOTAL', 185, tableY + 6.5, { align: 'right' });

  // Fila de datos
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFont("helvetica", "normal");
  const planTexto = datos.planNombre ? ` (${datos.planNombre})` : '';
  doc.text(`Suscripción Mensual Master Club Manager${planTexto} - ${datos.mesCobrado}`, 20, tableY + 18);
  doc.text(`${datos.cantidadJugadores} Atletas`, 120, tableY + 18, { align: 'center' });
  
  doc.setFont("helvetica", "bold");
  doc.text(`$ ${datos.montoTotal.toLocaleString('es-CO')}`, 185, tableY + 18, { align: 'right' });

  // Línea de cierre de tabla
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.1);
  doc.line(15, tableY + 25, 195, tableY + 25);

  // Cuadro de Total Final
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.rect(125, tableY + 25, 70, 12, 'F');
  doc.setFontSize(10);
  if (esCobro) {
    doc.setTextColor(amber[0], amber[1], amber[2]);
    doc.text('TOTAL A PAGAR:', 130, tableY + 33);
  } else {
    doc.setTextColor(green[0], green[1], green[2]);
    doc.text('TOTAL PAGADO:', 130, tableY + 33);
  }
  doc.text(`$ ${datos.montoTotal.toLocaleString('es-CO')}`, 190, tableY + 33, { align: 'right' });

  // 5. SECCIÓN DE CANALES DE PAGO (SI ES COBRO)
  let currentY = tableY + 45;
  if (esCobro && datos.canalesPago) {
    const canalesLines = datos.canalesPago.split('\n').filter(Boolean);
    const boxHeight = 11 + (canalesLines.length * 4.5);

    doc.setFillColor(254, 252, 232); // yellow-50
    doc.setDrawColor(254, 240, 138); // yellow-200
    doc.roundedRect(15, currentY, 180, boxHeight, 2, 2, 'FD');

    doc.setTextColor(113, 63, 18); // yellow-900
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text('CANALES OFICIALES DE PAGO PARA MASTER CLUB MANAGER:', 20, currentY + 6.5);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(133, 77, 14);
    canalesLines.forEach((linea, idx) => {
      doc.text(linea, 20, currentY + 11.5 + (idx * 4.3));
    });

    currentY += boxHeight + 6;
  }

  // 6. PIE DE PÁGINA
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(
    esCobro 
      ? 'Por favor envía el comprobante de transferencia al WhatsApp oficial de Master Club Manager.' 
      : 'Este documento es un comprobante de pago electrónico generado automáticamente por Master Club Manager.', 
    105, 
    currentY + 15, 
    { align: 'center' }
  );
  
  doc.setFont("helvetica", "bold");
  doc.text('¡Gracias por formar parte de la evolución tecnológica del deporte!', 105, currentY + 20, { align: 'center' });

  // Salida a Base64 (compatible con Evolution API)
  const base64PDF = btoa(doc.output());
  return base64PDF;
}

/**
 * Descarga directamente un PDF Base64 en el navegador
 */
export function descargarReciboSaaSPDF(base64PDF: string, filename: string) {
  const byteArray = new Uint8Array(atob(base64PDF).split('').map(c => c.charCodeAt(0)));
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

