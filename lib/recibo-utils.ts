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
  precioBase?: number;
  descuentoProntoPago?: number;
  consecutivo: string | number;
  metodo?: string;
  notas?: string;
  fecha?: string;        // Fecha de EMISIÓN del recibo (hoy)
  fechaPeriodo?: string; // Fecha del MES que se está cobrando (para el concepto)
  empresa: {
    nombre_club?: string;
    direccion: string;
    ciudad: string;
    nequi?: string;
    daviplata?: string;
    bre_b?: string;
    banco_nombre?: string;
    banco_numero?: string;
    logo_url?: string;
  }
}) {
  const doc = new jsPDF();
  // Fecha de emisión: siempre el día real de hoy (con T12:00:00 para evitar desfase UTC)
  const fechaEmision = datos.fecha
    ? new Date(datos.fecha.split('T')[0] + 'T12:00:00')
    : new Date();
  // Fecha del período cobrado: determina qué mes aparece en el CONCEPTO del recibo
  const fechaPeriodoObj = datos.fechaPeriodo
    ? new Date(datos.fechaPeriodo.split('T')[0] + 'T12:00:00')
    : fechaEmision;
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesNombre = meses[fechaPeriodoObj.getMonth()];
  const anioActual = fechaPeriodoObj.getFullYear();
  
  // Colores de Marca
  const naranjaGibbor = [249, 115, 22]; // #f97316
  const slate900 = [15, 23, 42];
  const slate500 = [100, 116, 139];
  const slate100 = [241, 245, 249];

  // LÓGICA DE ESTADO DINÁMICO (basada en fecha de emisión, no del período)
  const esPago = !!datos.metodo;
  const diaVence = 5;
  const esVencido = !esPago && fechaEmision.getDate() > diaVence;
  
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
  doc.text(esPago ? `Vía: ${(datos.metodo || '').toUpperCase()}` : (esVencido ? 'PAGO ATRASADO' : `VENCE EL DÍA ${diaVence}`), 177.5, 27, { align: 'center' });

  // Logo e Identidad
  try {
    if (datos.empresa.logo_url) {
      doc.addImage(datos.empresa.logo_url, 'PNG', 15, 8, 24, 24);
    } else {
      doc.addImage('https://i.postimg.cc/PNGqMH1m/escudo-gibbor.png', 'PNG', 15, 8, 24, 24);
    }
  } catch (e) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(datos.empresa.nombre_club ? datos.empresa.nombre_club.charAt(0) : 'C', 20, 25);
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

  // Caja de fondo
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.roundedRect(15, 62, 180, 30, 3, 3, 'F');

  // --- COLUMNA IZQUIERDA (Nombre + Categoría) ---
  // Etiquetas
  doc.setFontSize(7);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.setFont("helvetica", "normal");
  doc.text('NOMBRE COMPLETO:', 20, 70);
  doc.text('CATEGORÍA / GRUPO:', 20, 82);

  // Valores (truncados para que no invadan la columna derecha)
  const nombreCompleto = `${datos.nombres} ${datos.apellidos}`.toUpperCase();
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(nombreCompleto, 20, 75, { maxWidth: 85 });
  doc.setFontSize(9);
  doc.text((datos.grupo || 'GENERAL').toUpperCase(), 20, 87, { maxWidth: 85 });

  // --- COLUMNA DERECHA (Documento + Fecha) — separadas claramente ---
  doc.setFontSize(7);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.setFont("helvetica", "normal");
  doc.text('DOCUMENTO ID:', 115, 70);
  doc.text('FECHA EMISIÓN:', 115, 82);

  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(datos.documento || 'NO REGISTRADO', 115, 75);
  // Mostrar la fecha REAL de emisión (hoy), no el período cobrado
  doc.text(fechaEmision.toLocaleDateString('es-CO'), 115, 87);


  // 4. TABLA DE CONCEPTOS (PROFESIONAL)
  const tableY = 107;
  doc.setFillColor(slate900[0], slate900[1], slate900[2]);
  doc.rect(15, tableY, 180, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('DESCRIPCIÓN DEL CONCEPTO', 20, tableY + 6.5);
  doc.text('SUBTOTAL', 150, tableY + 6.5, { align: 'right' });
  doc.text('TOTAL', 185, tableY + 6.5, { align: 'right' });

  // Fila de datos - precio base
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFont("helvetica", "normal");
  const precioBaseDisplay = datos.precioBase ?? datos.tarifa;
  doc.text(`Aporte Mensual Formación Deportiva - ${mesNombre.toUpperCase()} ${anioActual}`, 20, tableY + 18);
  doc.text(`$ ${precioBaseDisplay.toLocaleString('es-CO')}`, 150, tableY + 18, { align: 'right' });
  doc.setFont("helvetica", "bold");
  doc.text(`$ ${precioBaseDisplay.toLocaleString('es-CO')}`, 185, tableY + 18, { align: 'right' });

  // Fila de descuento pronto pago (solo si aplica)
  let descuentoRowOffset = 0;
  if (datos.descuentoProntoPago && datos.descuentoProntoPago > 0) {
    descuentoRowOffset = 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(34, 197, 94); // Verde
    doc.text('✓ Descuento Pronto Pago (primeros 5 días)', 20, tableY + 27);
    doc.text(`- $ ${datos.descuentoProntoPago.toLocaleString('es-CO')}`, 150, tableY + 27, { align: 'right' });
    doc.setFont("helvetica", "bold");
    doc.text(`- $ ${datos.descuentoProntoPago.toLocaleString('es-CO')}`, 185, tableY + 27, { align: 'right' });
  }

  // Línea de cierre de tabla
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.1);
  doc.line(15, tableY + 25 + descuentoRowOffset, 195, tableY + 25 + descuentoRowOffset);

  // Cuadro de Total Final
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.rect(130, tableY + 25 + descuentoRowOffset, 65, 12, 'F');
  doc.setFontSize(11);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(esPago ? 'TOTAL PAGADO:' : 'TOTAL PENDIENTE:', 135, tableY + 33 + descuentoRowOffset);
  doc.text(`$ ${datos.tarifa.toLocaleString('es-CO')}`, 190, tableY + 33 + descuentoRowOffset, { align: 'right' });


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
  const nombreClubUpper = (datos.empresa.nombre_club || 'EL CLUB').toUpperCase();
  doc.text(`ADMINISTRACIÓN ${nombreClubUpper}`, 155, footerY + 9, { align: 'center' });

  doc.setFontSize(6);
  doc.text(`Este recibo es un comprobante oficial de pago generado digitalmente.`, 105, 280, { align: 'center' });
  doc.text(`${nombreClubUpper} - Plataforma Oficial`, 105, 284, { align: 'center' });

  return doc.output('datauristring').split(',')[1];
}

/**
 * Genera un PDF de Comprobante de Pago de Nómina para Entrenadores
 */
export async function generarReciboNominaPDFBase64(datos: {
  nombres: string;
  apellidos: string;
  documento?: string;
  cargo?: string;
  monto: number;
  periodo: string;        // ej: "Mayo 2026"
  consecutivo: string | number;
  fecha?: string;
  empresa: {
    nombre_club?: string;
    direccion: string;
    ciudad: string;
    logo_url?: string;
  }
}) {
  const doc = new jsPDF();
  const fechaActual = datos.fecha ? new Date(datos.fecha) : new Date();

  // Paleta diferenciada: Índigo/Azul para nómina
  const indigoOscuro   = [30,  27,  75];   // slate alternativo
  const indigoAccent   = [79,  70, 229];   // #4f46e5
  const indigoLight    = [238, 242, 255];
  const slateGris      = [100, 116, 139];
  const slateOscuro    = [15,  23,  42];

  // 1. ENCABEZADO
  doc.setFillColor(indigoOscuro[0], indigoOscuro[1], indigoOscuro[2]);
  doc.rect(0, 0, 210, 40, 'F');

  // Badge tipo
  doc.setFillColor(indigoAccent[0], indigoAccent[1], indigoAccent[2]);
  doc.rect(145, 0, 65, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text('COMPROBANTE', 177.5, 19, { align: 'center' });
  doc.text('DE NÓMINA', 177.5, 26, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`#${String(datos.consecutivo).padStart(4, '0')}`, 177.5, 32, { align: 'center' });

  // Logo e identidad
  try {
    if (datos.empresa.logo_url) {
      doc.addImage(datos.empresa.logo_url, 'PNG', 15, 8, 24, 24);
    } else {
      doc.addImage('https://i.postimg.cc/PNGqMH1m/escudo-gibbor.png', 'PNG', 15, 8, 24, 24);
    }
  } catch (e) { /* sin logo */ }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(datos.empresa.nombre_club || 'EFD GIBBOR', 45, 22);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 210);
  doc.text(`${datos.empresa.direccion} • ${datos.empresa.ciudad}`, 45, 28);
  doc.text(`Período: ${datos.periodo}`, 45, 33);

  // 2. DATOS DEL ENTRENADOR
  doc.setTextColor(slateOscuro[0], slateOscuro[1], slateOscuro[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text('DATOS DEL ENTRENADOR', 15, 55);
  doc.setDrawColor(indigoAccent[0], indigoAccent[1], indigoAccent[2]);
  doc.setLineWidth(0.5);
  doc.line(15, 57, 30, 57);

  doc.setFillColor(indigoLight[0], indigoLight[1], indigoLight[2]);
  doc.roundedRect(15, 62, 180, 30, 3, 3, 'F');

  // Columna izquierda
  doc.setFontSize(7);
  doc.setTextColor(slateGris[0], slateGris[1], slateGris[2]);
  doc.setFont("helvetica", "normal");
  doc.text('NOMBRE COMPLETO:', 20, 70);
  doc.text('CARGO / ROL:', 20, 82);

  doc.setTextColor(slateOscuro[0], slateOscuro[1], slateOscuro[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`${datos.nombres} ${datos.apellidos}`.toUpperCase(), 20, 75, { maxWidth: 85 });
  doc.text((datos.cargo || 'ENTRENADOR').toUpperCase(), 20, 87, { maxWidth: 85 });

  // Columna derecha
  doc.setFontSize(7);
  doc.setTextColor(slateGris[0], slateGris[1], slateGris[2]);
  doc.setFont("helvetica", "normal");
  doc.text('DOCUMENTO ID:', 115, 70);
  doc.text('FECHA DE PAGO:', 115, 82);

  doc.setTextColor(slateOscuro[0], slateOscuro[1], slateOscuro[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(datos.documento || 'NO REGISTRADO', 115, 75);
  doc.text(fechaActual.toLocaleDateString('es-CO'), 115, 87);

  // 3. TABLA DE CONCEPTO
  const tableY = 107;
  doc.setFillColor(indigoOscuro[0], indigoOscuro[1], indigoOscuro[2]);
  doc.rect(15, tableY, 180, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('DESCRIPCIÓN DEL CONCEPTO', 20, tableY + 6.5);
  doc.text('VALOR', 185, tableY + 6.5, { align: 'right' });

  doc.setTextColor(slateOscuro[0], slateOscuro[1], slateOscuro[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`Honorarios / Salario - ${datos.periodo}`, 20, tableY + 18);
  doc.setFont("helvetica", "bold");
  doc.text(`$ ${datos.monto.toLocaleString('es-CO')}`, 185, tableY + 18, { align: 'right' });

  doc.setDrawColor(220, 220, 230);
  doc.setLineWidth(0.1);
  doc.line(15, tableY + 25, 195, tableY + 25);

  // Total
  doc.setFillColor(indigoLight[0], indigoLight[1], indigoLight[2]);
  doc.rect(130, tableY + 25, 65, 12, 'F');
  doc.setFontSize(11);
  doc.setTextColor(indigoAccent[0], indigoAccent[1], indigoAccent[2]);
  doc.text('TOTAL PAGADO:', 135, tableY + 33);
  doc.text(`$ ${datos.monto.toLocaleString('es-CO')}`, 190, tableY + 33, { align: 'right' });

  // 4. NOTA LEGAL
  doc.setFillColor(245, 245, 255);
  doc.roundedRect(15, tableY + 45, 180, 16, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(slateGris[0], slateGris[1], slateGris[2]);
  doc.setFont("helvetica", "normal");
  doc.text('Este comprobante certifica el pago de honorarios al colaborador indicado por los servicios', 20, tableY + 53);
  doc.text(`prestados en el período ${datos.periodo}. Documento generado digitalmente.`, 20, tableY + 58);

  // 5. FIRMA
  const footerY = 210;
  // Línea firma entrenador
  doc.setDrawColor(180, 180, 200);
  doc.line(20, footerY, 85, footerY);
  doc.setFontSize(7);
  doc.setTextColor(slateGris[0], slateGris[1], slateGris[2]);
  doc.text('FIRMA DEL ENTRENADOR', 52, footerY + 5, { align: 'center' });

  // Línea firma director
  doc.line(120, footerY, 185, footerY);
  doc.text('FIRMA DIRECTOR / ADMINISTRADOR', 152, footerY + 5, { align: 'center' });

  // Pie
  doc.setFontSize(6);
  const nombreClubUpper = (datos.empresa.nombre_club || 'EL CLUB').toUpperCase();
  doc.text(`${nombreClubUpper} — Comprobante oficial de pago de nómina. Conserve este documento.`, 105, 280, { align: 'center' });

  return doc.output('datauristring').split(',')[1];
}
