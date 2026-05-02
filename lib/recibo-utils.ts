import jsPDF from 'jspdf';

/**
 * Genera un PDF Élite de recibo Gibbor en formato Base64
 */
export async function generarReciboPDFBase64(datos: {
  nombres: string;
  apellidos: string;
  documento?: string;
  grupo?: string;
  tarifa: number;
  consecutivo: string | number;
  metodo?: string;
  notas?: string;
  fecha?: string;
  empresa: {
    nombre_club?: string;
    direccion: string;
    ciudad: string;
    nequi?: string;
    daviplata?: string;
    bre_b?: string;
    banco_nombre?: string;
    banco_numero?: string;
  }
}) {
  const doc = new jsPDF();
  const fechaActual = datos.fecha ? new Date(datos.fecha) : new Date();
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesNombre = meses[fechaActual.getMonth()];
  const anioActual = fechaActual.getFullYear();
  
  // Colores de Marca
  const naranjaGibbor = [249, 115, 22]; // #f97316
  const slate900 = [15, 23, 42];
  const slate500 = [100, 116, 139];
  const slate100 = [241, 245, 249];

  // LÓGICA DE ESTADO DINÁMICO
  const esPago = !!datos.metodo;
  const diaVence = 5;
  const esVencido = !esPago && fechaActual.getDate() > diaVence;
  
  const statusLabel = esPago ? 'PAGO CONFIRMADO' : (esVencido ? 'RECIBO VENCIDO' : 'PENDIENTE DE PAGO');
  const statusColor = esPago ? [34, 197, 94] : (esVencido ? [220, 38, 38] : [255, 120, 0]); // Verde : Rojo : Naranja

  // 1. ENCABEZADO Y LOGO
  doc.setFillColor(slate900[0], slate900[1], slate900[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  // Badge de Estado dinámico
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.rect(145, 0, 65, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(statusLabel, 177.5, 22, { align: 'center' });
  
  // Subtexto de estado
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(esPago ? `Vía: ${datos.metodo.toUpperCase()}` : (esVencido ? 'PAGO ATRASADO' : `VENCE EL DÍA ${diaVence}`), 177.5, 27, { align: 'center' });

  // Logo e Identidad
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
  doc.text(datos.empresa.nombre_club || 'EFD GIBBOR', 45, 22);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(`${datos.empresa.direccion} • ${datos.empresa.ciudad}`, 45, 28);
  doc.text(`Recibo: #${String(datos.consecutivo).padStart(4, '0')}`, 45, 33);


  // 3. INFORMACIÓN DEL JUGADOR
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text('INFORMACIÓN DEL ALUMNO', 15, 55);
  
  doc.setDrawColor(naranjaGibbor[0], naranjaGibbor[1], naranjaGibbor[2]);
  doc.setLineWidth(0.5);
  doc.line(15, 57, 30, 57);

  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.roundedRect(15, 62, 180, 25, 3, 3, 'F');
  
  doc.setFontSize(8);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.setFont("helvetica", "normal");
  doc.text('NOMBRE COMPLETO:', 22, 70);
  doc.text('CATEGORÍA / GRUPO:', 22, 80);
  doc.text('DOCUMENTO ID:', 110, 70);
  doc.text('FECHA EMISIÓN:', 110, 80);

  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${datos.nombres} ${datos.apellidos}`.toUpperCase(), 55, 70);
  doc.text(datos.grupo || 'GENERAL', 55, 80);
  doc.text(datos.documento || '---', 140, 70);
  doc.text(fechaActual.toLocaleDateString(), 140, 80);

  // 4. TABLA DE CONCEPTOS (PROFESIONAL)
  const tableY = 100;
  doc.setFillColor(slate900[0], slate900[1], slate900[2]);
  doc.rect(15, tableY, 180, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('DESCRIPCIÓN DEL CONCEPTO', 20, tableY + 6.5);
  doc.text('SUBTOTAL', 150, tableY + 6.5, { align: 'right' });
  doc.text('TOTAL', 185, tableY + 6.5, { align: 'right' });

  // Fila de datos
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`Aporte Mensual Formación Deportiva - ${mesNombre.toUpperCase()} ${anioActual}`, 20, tableY + 18);
  doc.text(`$ ${datos.tarifa.toLocaleString()}`, 150, tableY + 18, { align: 'right' });
  doc.setFont("helvetica", "bold");
  doc.text(`$ ${datos.tarifa.toLocaleString()}`, 185, tableY + 18, { align: 'right' });

  // Línea de cierre de tabla
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.1);
  doc.line(15, tableY + 25, 195, tableY + 25);

  // Cuadro de Total Final
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.rect(130, tableY + 25, 65, 12, 'F');
  doc.setFontSize(11);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(esPago ? 'TOTAL PAGADO:' : 'TOTAL PENDIENTE:', 135, tableY + 33);
  doc.text(`$ ${datos.tarifa.toLocaleString()}`, 190, tableY + 33, { align: 'right' });


  // 5. MÉTODOS DE PAGO (BIEN DEFINIDOS)
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text('CANALES DE PAGO DISPONIBLES', 15, 155);
  doc.line(15, 157, 30, 157);

  let paymentY = 165;
  const colWidth = 58;
  
  // Tarjetas de pago sutiles
  if (datos.empresa.nequi) {
    doc.setFillColor(245, 243, 255); // Púrpura sutil
    doc.roundedRect(15, paymentY, colWidth, 15, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(107, 33, 168);
    doc.text('NEQUI', 18, paymentY + 5);
    doc.setFontSize(9);
    doc.text(datos.empresa.nequi, 18, paymentY + 11);
  }

  if (datos.empresa.daviplata) {
    doc.setFillColor(254, 242, 242); // Rojo sutil
    doc.roundedRect(15 + colWidth + 3, paymentY, colWidth, 15, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(185, 28, 28);
    doc.text('DAVIPLATA', 15 + colWidth + 6, paymentY + 5);
    doc.setFontSize(9);
    doc.text(datos.empresa.daviplata, 15 + colWidth + 6, paymentY + 11);
  }

  if (datos.empresa.banco_nombre) {
    doc.setFillColor(239, 246, 255); // Azul sutil
    doc.roundedRect(15 + (colWidth + 3) * 2, paymentY, colWidth, 15, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setTextColor(29, 78, 216);
    doc.text(datos.empresa.banco_nombre.toUpperCase(), 15 + (colWidth + 3) * 2 + 3, paymentY + 5);
    doc.setFontSize(8);
    doc.text(datos.empresa.banco_numero || '', 15 + (colWidth + 3) * 2 + 3, paymentY + 11);
  }

  if (datos.empresa.bre_b) {
     paymentY += 20;
     doc.setFillColor(254, 252, 232); // Amarillo sutil
     doc.roundedRect(15, paymentY, 180, 10, 2, 2, 'F');
     doc.setFontSize(8);
     doc.setTextColor(161, 98, 7);
     doc.setFont("helvetica", "bold");
     doc.text(`NUEVO: Paga también vía BRE-B: ${datos.empresa.bre_b}`, 20, paymentY + 6.5);
  }

  // 6. PIE DE PÁGINA Y FIRMA
  const footerY = 240;
  doc.setDrawColor(slate100[0], slate100[1], slate100[2]);
  doc.line(130, footerY, 180, footerY);
  doc.setFontSize(7);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.setFont("helvetica", "normal");
  doc.text('FIRMA AUTORIZADA', 155, footerY + 5, { align: 'center' });
  doc.text('ADMINISTRACIÓN EFD GIBBOR', 155, footerY + 9, { align: 'center' });

  doc.setFontSize(6);
  doc.text('Este recibo es un comprobante oficial de pago generado digitalmente por Gibbor App.', 105, 280, { align: 'center' });
  doc.text('EFD GIBBOR - Formando Campeones para la Vida.', 105, 284, { align: 'center' });

  return doc.output('datauristring').split(',')[1];
}
