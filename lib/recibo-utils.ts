import jsPDF from 'jspdf';

/**
 * Genera un PDF profesional de recibo Gibbor en formato Base64
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
    direccion: string;
    ciudad: string;
    nequi?: string;
    daviplata?: string;
    banco?: string;
  }
}) {
  const doc = new jsPDF();
  const fechaActual = datos.fecha ? new Date(datos.fecha) : new Date();
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesNombre = meses[fechaActual.getMonth()];
  const anioActual = fechaActual.getFullYear();
  
  // Lógica de color según estado
  const esVencido = !datos.metodo && fechaActual.getDate() > 5;
  const statusLabel = datos.metodo ? 'PAGO CONFIRMADO' : (esVencido ? 'VENCIDO' : 'PENDIENTE PAGO');
  const statusColor = datos.metodo ? [34, 197, 94] : (esVencido ? [220, 38, 38] : [255, 120, 0]);

  // Logo simulación (espacio)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  doc.text('EFD GIBBOR', 15, 25);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(datos.empresa.direccion, 15, 30);
  doc.text(datos.empresa.ciudad, 15, 34);
  
  // Caja de Estado
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.rect(145, 15, 50, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(statusLabel, 170, 21.5, { align: 'center' });

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8);
  doc.text(`Fecha: ${fechaActual.toLocaleDateString()}`, 145, 30);
  doc.text(`Recibo: #${String(datos.consecutivo).padStart(4, '0')}`, 145, 34);

  doc.setDrawColor(240, 240, 240);
  doc.line(15, 40, 195, 40);

  // Alumno
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 45, 180, 20, 3, 3, 'F');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('RECEPTOR / FUTBOLISTA', 20, 51);
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(`${datos.nombres} ${datos.apellidos}`.toUpperCase(), 20, 58);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`ID: ${datos.documento || '---'} | Categoría: ${datos.grupo || 'General'}`, 20, 62);

  // Tabla
  doc.setFillColor(30, 41, 59);
  doc.rect(15, 70, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('CONCEPTO', 20, 75.5);
  doc.text('TOTAL', 175, 75.5, { align: 'right' });

  doc.setTextColor(30, 41, 59);
  doc.text(`Mensualidad Formación Deportiva - ${mesNombre} ${anioActual}`, 20, 85);
  doc.text(`$ ${datos.tarifa.toLocaleString()}`, 175, 85, { align: 'right' });
  
  doc.line(15, 90, 195, 90);

  // Pagos y Notas
  doc.setFillColor(255, 247, 237);
  doc.roundedRect(15, 100, 180, 30, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(194, 65, 12);
  doc.setFont("helvetica", "bold");
  doc.text('MEDIOS DE PAGO:', 20, 106);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  
  const mP = [
    datos.empresa.nequi ? `Nequi: ${datos.empresa.nequi}` : null,
    datos.empresa.daviplata ? `Daviplata: ${datos.empresa.daviplata}` : null,
    datos.empresa.banco ? `Banco: ${datos.empresa.banco}` : null
  ].filter(Boolean);
  
  doc.text(mP.join(' | '), 20, 112);
  doc.text('• Envía tu soporte al finalizar la transacción para registrar tu pago.', 20, 116);
  doc.text('• Descuento de pronto pago aplica en los primeros 5 días del mes.', 20, 120);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Documento oficial emitido por EFD Gibbor. Generado automáticamente.', 105, 200, { align: 'center' });

  return doc.output('datauristring').split(',')[1];
}
