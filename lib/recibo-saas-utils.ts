import jsPDF from 'jspdf';

/**
 * Genera un PDF Élite de recibo Gibbor SaaS en formato Base64 para el cobro a clubes
 */
export async function generarReciboSaaSPDFBase64(datos: {
  clubNombre: string;
  clubDocumento?: string;
  clubTelefono?: string;
  mesCobrado: string; // e.g. "Julio 2026"
  cantidadJugadores: number;
  montoTotal: number;
  consecutivo: string | number;
  metodoPago: string;
  fechaPago: string; // Fecha en la que se pagó
}) {
  const doc = new jsPDF();
  
  // Colores de Marca Gibbor
  const naranjaGibbor = [249, 115, 22]; // #f97316
  const slate900 = [15, 23, 42];
  const slate500 = [100, 116, 139];
  const slate100 = [241, 245, 249];
  const green = [34, 197, 94];

  // 1. ENCABEZADO Y LOGO
  doc.setFillColor(slate900[0], slate900[1], slate900[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  // Badge de Estado (Siempre Pagado en este recibo)
  doc.setFillColor(green[0], green[1], green[2]);
  doc.rect(145, 0, 65, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text('PAGO CONFIRMADO', 177.5, 22, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Vía: ${datos.metodoPago.toUpperCase()}`, 177.5, 27, { align: 'center' });

  // Logo e Identidad (Gibbor Principal)
  try {
    doc.addImage('https://i.postimg.cc/PNGqMH1m/escudo-gibbor.png', 'PNG', 15, 8, 24, 24);
  } catch (e) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('G', 20, 25);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text('GIBBOR APP', 45, 22);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text('Plataforma Tecnológica Deportiva', 45, 28);
  doc.text(`Comprobante: #${String(datos.consecutivo).padStart(4, '0')}`, 45, 33);


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
  doc.text('FECHA DE PAGO:', 115, 82);

  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(datos.clubDocumento || 'NO REGISTRADO', 115, 75);
  
  const fechaObj = new Date(datos.fechaPago.split('T')[0] + 'T12:00:00');
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
  doc.text(`Suscripción Mensual Gibbor App - ${datos.mesCobrado}`, 20, tableY + 18);
  doc.text(`${datos.cantidadJugadores} Atletas`, 120, tableY + 18, { align: 'center' });
  
  doc.setFont("helvetica", "bold");
  doc.text(`$ ${datos.montoTotal.toLocaleString('es-CO')}`, 185, tableY + 18, { align: 'right' });

  // Línea de cierre de tabla
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.1);
  doc.line(15, tableY + 25, 195, tableY + 25);

  // Cuadro de Total Final
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.rect(130, tableY + 25, 65, 12, 'F');
  doc.setFontSize(11);
  doc.setTextColor(green[0], green[1], green[2]);
  doc.text('TOTAL PAGADO:', 135, tableY + 33);
  doc.text(`$ ${datos.montoTotal.toLocaleString('es-CO')}`, 190, tableY + 33, { align: 'right' });


  // 5. PIE DE PÁGINA
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text('Este documento es un comprobante de pago electrónico generado automáticamente por Gibbor App.', 105, 160, { align: 'center' });
  
  doc.setFont("helvetica", "bold");
  doc.text('¡Gracias por formar parte de la evolución tecnológica del deporte!', 105, 165, { align: 'center' });

  // Salida a Base64 (compatible con Evolution API)
  const base64PDF = btoa(doc.output());
  return base64PDF;
}
