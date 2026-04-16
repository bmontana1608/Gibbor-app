'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { Wallet, Settings, Flame, Calendar, Search, CheckCircle, Smartphone, UserCircle, CreditCard, Printer, ClipboardCheck, Trash2, PlusCircle, X, Bot, MessageSquare, Loader2, Sparkles } from 'lucide-react';

export default function ModuloCobranza() {
  const router = useRouter();
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [activeTab, setActiveTab] = useState<'ingresos' | 'egresos'>('ingresos');

  // Estados para Modal de Pago Detallado (Controla.club style)
  const [isModalPagoOpen, setIsModalPagoOpen] = useState(false);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<any>(null);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [recargo, setRecargo] = useState(0);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [notas, setNotas] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);

  // Estado para Egresos
  const [egresos, setEgresos] = useState<any[]>([]);
  const [isModalEgresoOpen, setIsModalEgresoOpen] = useState(false);
  const [descEgreso, setDescEgreso] = useState('');
  const [montoEgreso, setMontoEgreso] = useState('');
  const [catEgreso, setCatEgreso] = useState('Otros');

  // Historial de Pagos (Ingresos)
  const [historialPagos, setHistorialPagos] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);

  // Recibo Generado para impresión
  const [reciboGenerado, setReciboGenerado] = useState<any>(null);

  // Estados para el Asistente Inteligente
  const [automatedTasks, setAutomatedTasks] = useState<any[]>([]);
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [notificacionesMes, setNotificacionesMes] = useState<any[]>([]);

  const hoy = new Date();
  const diaActual = hoy.getDate();

  const calcularTarifa = (tipoPlan: string) => {
    const planBuscado = planes.find(p => p.nombre === (tipoPlan || 'Regular'));
    if (!planBuscado) return 0;
    
    const limiteProntoPago = planBuscado.dias_limite_pronto_pago || 5;
    const diaCobro = planBuscado.dia_cobro_mensual || 1;

    // Si el día actual es menor o igual al día de cobro + periodo de gracia
    // Consideramos pronto pago si estamos dentro de los primeros X días del mes (ajustable)
    // O mejor: si diaActual <= dias_limite_pronto_pago
    if (diaActual <= limiteProntoPago) {
      return Number(planBuscado.precio_base) - Number(planBuscado.descuento_pronto_pago);
    }
    return Number(planBuscado.precio_base);
  };

  const cargarDatos = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .not('rol', 'in', '("Director","Entrenador")')
      .neq('estado_miembro', 'Pendiente')
      .order('nombres', { ascending: true });

    if (error) {
      toast.error(`Error al cargar datos: ${error.message}`);
    }
    if (data) {
      setJugadores(data);
    }
    
    const { data: planesData } = await supabase.from('planes').select('*');
    if (planesData) setPlanes(planesData);

    const { data: histData } = await supabase
      .from('pagos_ingresos')
      .select('*')
      .order('fecha', { ascending: false });
    
    const { data: egresosData } = await supabase
      .from('pagos_egresos')
      .select('*')
      .order('fecha', { ascending: false });

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
    const { data: msgData } = await supabase
      .from('mensajes_wa')
      .select('destinatario_numero, created_at')
      .eq('tipo_mensaje', 'Recibo')
      .gte('created_at', inicioMes);

    if (histData) setHistorialPagos(histData);
    if (egresosData) setEgresos(egresosData);
    if (msgData) setNotificacionesMes(msgData);
    setCargando(false);
  };

  const registrarEgreso = async () => {
    if (!descEgreso || !montoEgreso) return toast.error("Llena todos los campos");
    const { error } = await supabase.from('pagos_egresos').insert([{
      descripcion: descEgreso,
      monto: Number(montoEgreso),
      categoria: catEgreso,
      fecha: new Date().toISOString().split('T')[0]
    }]);

    if (error) toast.error("Error: " + error.message);
    else {
      toast.success("Gasto registrado");
      setIsModalEgresoOpen(false);
      setDescEgreso(''); setMontoEgreso('');
      cargarDatos();
    }
  };

  const eliminarEgreso = async (id: string) => {
    if (window.confirm("¿Eliminar este registro de gasto?")) {
      await supabase.from('pagos_egresos').delete().eq('id', id);
      cargarDatos();
    }
  };

  const eliminarPagoHistorial = async (id: string, numero: number) => {
    if (window.confirm(`¿Estás seguro de eliminar el registro del recibo № ${numero}? Esto no cambiará el estado de deuda del alumno.`)) {
      const { error } = await supabase.from('pagos_ingresos').delete().eq('id', id);
      if (error) toast.error("Error al eliminar: " + error.message);
      else {
        toast.success("Registro eliminado");
        cargarDatos();
      }
    }
  };
  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const diaHoy = new Date().getDate();
    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();
    
    const idsPagados = new Set(
      historialPagos
        .filter(p => {
          const f = new Date(p.fecha);
          return (f.getMonth() + 1) === mesActual && f.getFullYear() === anioActual;
        })
        .map(p => p.jugador_id)
    );

    const numsNotificados = new Set(
      notificacionesMes.map(m => m.destinatario_numero.replace(/\D/g, ''))
    );

    const tasks = jugadores
      .filter(j => {
        const numLimpio = String(j.telefono || '').replace(/\D/g, '');
        const yaNotificado = numsNotificados.has(numLimpio) || numsNotificados.has(`57${numLimpio}`);
        
        const leTocaHoy = (j.dia_pago || 1) === diaHoy;
        const noHaPagado = !idsPagados.has(j.id);
        const tieneTarifa = calcularTarifa(j.tipo_plan) > 0;
        
        return leTocaHoy && noHaPagado && tieneTarifa && !yaNotificado;
      })
      .map(j => ({ ...j, tarifa: calcularTarifa(j.tipo_plan) }));

    setAutomatedTasks(tasks);
  }, [jugadores, historialPagos, planes, notificacionesMes]);


  const handleSendBatch = async () => {
    if (!window.confirm(`¿Deseas enviar ${automatedTasks.length} recibos automáticamente?`)) return;
    
    setIsSendingBatch(true);
    setBatchProgress(0);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < automatedTasks.length; i++) {
      const alumno = automatedTasks[i];
      try {
        await handleNotificar(alumno);
        successCount++;
      } catch (error) {
        console.error(`Error enviando a ${alumno.nombres}`, error);
        failCount++;
      }
      setBatchProgress(i + 1);
      // Pequeña espera para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setIsSendingBatch(false);
    setAutomatedTasks([]);
    
    if (failCount === 0) {
      toast.success(`¡Tarea finalizada! Se enviaron ${successCount} recibos con éxito.`);
    } else {
      toast.warning(`Tarea completada con observaciones. Éxitos: ${successCount}, Fallos: ${failCount}.`);
    }
  };

  const actualizarPlan = async (id: string, nuevoPlan: string, nombreCompleto: string) => {
    const { error } = await supabase.from('perfiles').update({ tipo_plan: nuevoPlan }).eq('id', id);
    if (error) { 
      toast.error(`Error al cambiar el plan: ${error.message}`); 
    } else {
      toast.success(`Plan de ${nombreCompleto} actualizado a ${nuevoPlan}`);
      cargarDatos();
    }
  };

  const actualizarDiaPago = async (id: string, nuevoDia: number) => {
    const { error } = await supabase.from('perfiles').update({ dia_pago: nuevoDia }).eq('id', id);
    if (error) toast.error("Error: " + error.message);
    else toast.success("Día de pago actualizado");
  };

  const abrirModalPago = (jugador: any) => {
    setJugadorSeleccionado(jugador);
    setMontoRecibido('');
    setDescuento(0);
    setRecargo(0);
    setMetodoPago('Efectivo');
    setNotas('');
    setIsModalPagoOpen(true);
  };

  const confirmarPago = async () => {
    if (!jugadorSeleccionado) return;
    
    const tarifaBase = calcularTarifa(jugadorSeleccionado.tipo_plan);
    const total = tarifaBase - descuento + recargo;

    const toastId = toast.loading(`Confirmando pago de ${jugadorSeleccionado.nombres}...`);

    const { error } = await supabase
      .from('perfiles')
      .update({ estado_pago: 'Al día' })
      .eq('id', jugadorSeleccionado.id);

    if (error) {
      toast.error('Error al registrar pago: ' + error.message, { id: toastId });
    } else {
      const payloadHistorial = {
        jugador_id: jugadorSeleccionado.id,
        nombres: jugadorSeleccionado.nombres,
        apellidos: jugadorSeleccionado.apellidos,
        grupo: jugadorSeleccionado.grupos || 'Sin grupo',
        monto_base: tarifaBase,
        descuento,
        recargo,
        total,
        metodo_pago: metodoPago,
        notas,
        fecha: fechaPago
      };

      const { data: dataHist } = await supabase
        .from('pagos_ingresos')
        .insert([payloadHistorial])
        .select()
        .single();

      toast.success('¡Pago registrado con éxito!', { id: toastId });
      
      setReciboGenerado({
        nombres: jugadorSeleccionado.nombres,
        apellidos: jugadorSeleccionado.apellidos,
        telefono: jugadorSeleccionado.telefono,
        grupo: jugadorSeleccionado.grupos || 'Sin grupo',
        fecha: fechaPago,
        metodo: metodoPago,
        montoBase: tarifaBase,
        descuento,
        recargo,
        total,
        consecutivo: dataHist?.consecutivo || Math.floor(Math.random() * 1000)
      });
      setIsModalPagoOpen(false);
      cargarDatos();
    }
  };

  const [loadingBot, setLoadingBot] = useState<string | null>(null);

  const handleNotificar = async (alumno: any) => {
    // Seguridad: Si no trae la tarifa calculada, la calculamos aquí
    if (!alumno.tarifa) {
      alumno.tarifa = calcularTarifa(alumno.tipo_plan);
    }
    
    setLoadingBot(alumno.id);
    
    try {
      const { data: config } = await supabase.from('configuracion_wa').select('*').single();
      if (!config || !config.api_url || !config.api_key) {
        toast.error("Configura el asistente primero.");
        return;
      }

      const cleanUrl = config.api_url.endsWith('/') ? config.api_url.slice(0, -1) : config.api_url;
      const instanceName = config.instance_name || 'Gibbor_App';

      let cleanedNumber = String(alumno.telefono || '').replace(/\D/g, '');
      // Si el número empieza con el código de país pero sin +, o es local de 10 dígitos
      if (cleanedNumber.length === 10) {
        cleanedNumber = `57${cleanedNumber}`;
      } else if (cleanedNumber.length === 12 && cleanedNumber.startsWith('57')) {
        // Ya tiene el código de país, lo dejamos así
      }

      // --- DATOS DINÁMICOS ---
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const fechaActual = new Date();
      const mesNombre = meses[fechaActual.getMonth()];
      const anioActual = fechaActual.getFullYear();
      
      const direccionClub = config.direccion || 'Calle Ficticia #12-34';
      const ciudadClub = config.ciudad || 'Cúcuta, Norte de Santander';
      const nuevoConsecutivo = (config.ultimo_consecutivo_recibo || 0) + 1;

      // --- LÓGICA DE ESTADO INTELIGENTE (1-5 día) ---
      const diaActual = fechaActual.getDate();
      const esVencido = diaActual > 5;
      const statusLabel = esVencido ? 'VENCIDO' : 'PENDIENTE PAGO';
      const statusColor = esVencido ? [220, 38, 38] : [255, 120, 0]; // Rojo : Naranja

      // --- GENERACIÓN DE PDF PROFESIONAL ---
      const doc = new jsPDF();
      
      try {
        const logoUrl = '/logo.png';
        const img = new Image();
        img.src = logoUrl;
        doc.addImage(img, 'PNG', 15, 15, 25, 25);
      } catch (e) {
        console.warn("Logo no disponible");
      }

      // Encabezado Corporativo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text('EFD GIBBOR', 45, 25);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(direccionClub, 45, 30);
      doc.text(ciudadClub, 45, 34);
      
      // Caja de Estado Inteligente
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.rect(145, 15, 50, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(statusLabel, 170, 21.5, { align: 'center' });

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.text(`Expedido: ${fechaActual.toLocaleDateString()}`, 145, 30);
      doc.text(`Recibo: #${nuevoConsecutivo.toString().padStart(4, '0')}`, 145, 34);

      // Línea divisoria
      doc.setDrawColor(240, 240, 240);
      doc.line(15, 45, 195, 45);

      // Alumno
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, 50, 180, 20, 3, 3, 'F');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('RECEPTOR DEL RECIBO', 20, 56);
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(alumno.nombres.toUpperCase(), 20, 63);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Identificación: ${alumno.documento || '---'}`, 20, 68);
      doc.text(`Categoría: ${alumno.grupos || 'Juvenil'}`, 100, 68);

      // Detalle Table
      doc.setFillColor(30, 41, 59);
      doc.rect(15, 75, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text('DESCRIPCIÓN DEL CARGO', 20, 80.5);
      doc.text('MONTO', 175, 80.5, { align: 'right' });

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.text(`Mensualidad Deportiva - ${mesNombre} ${anioActual}`, 20, 92);
      doc.text(`$ ${alumno.tarifa.toLocaleString()}`, 175, 92, { align: 'right' });
      
      doc.line(15, 98, 195, 98);

      // Total
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text('TOTAL A PAGAR:', 120, 110);
      doc.setTextColor(255, 120, 0);
      doc.text(`$ ${alumno.tarifa.toLocaleString()}`, 180, 110, { align: 'right' });

      // BLOQUE DE NOTAS Y PAGOS
      doc.setFillColor(255, 247, 237); // Light Orange
      doc.roundedRect(15, 125, 180, 35, 3, 3, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(194, 65, 12); // Darker Orange
      doc.setFont("helvetica", "bold");
      doc.text('POLÍTICAS DE PAGO Y DESCUENTOS:', 20, 132);
      
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text('• Descuento de $10.000 por pronto pago si se liquida en los primeros 5 días del mes.', 20, 138);
      doc.text('• Este descuento NO aplica para futbolistas con beca otorgada por el club.', 20, 141);
      
      // Métodos de Pago dinámicos con seguridad
      const pagosNequi = config.nequi ? `Nequi: ${config.nequi}` : "";
      const pagosDavi = config.daviplata ? `Daviplata: ${config.daviplata}` : "";
      const pagosBreB = config.bre_b ? `Bre-B: ${config.bre_b}` : "";
      const pagosBanco = config.banco_nombre ? `${config.banco_nombre}: ${config.banco_numero}` : "";

      const stringMetodos = [pagosNequi, pagosDavi, pagosBreB].filter(Boolean).join(" / ");
      
      doc.text(`• Pagos: ${stringMetodos || 'Contactar al club para métodos de pago'}`, 20, 146);
      if (pagosBanco) {
        doc.text(`• ${pagosBanco}`, 20, 149);
      }

      doc.setFont("helvetica", "bold");
      doc.text('Enviar soporte de pago al asistente de WhatsApp para registro contable.', 20, 154);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('EFD GIBBOR - Formando Grandes Talentos. Documento digital oficial.', 105, 200, { align: 'center' });

      const pdfBase64 = doc.output('datauristring').split(',')[1];

      // Mensaje de WhatsApp
      const vencimiento = `5/${new Date().getMonth() + 1}/${anioActual}`;
      const texto = `Hola ${alumno.nombres} 👋, aquí tienes tu recibo de Mensualidad por $ ${alumno.tarifa.toLocaleString()} (vence ${vencimiento}). Recuerda que si pagas antes del 5 tienes descuento de $10.000. Gracias por confiar en EFD Gibbor ✨`;

      const res = await fetch(`${cleanUrl}/message/sendMedia/${instanceName}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': config.api_key 
        },
        body: JSON.stringify({
          number: cleanedNumber,
          media: pdfBase64,
          mediatype: "document",
          mimetype: "application/pdf",
          fileName: `Recibo_${mesNombre}_${alumno.nombres.replace(/\s/g, '_')}.pdf`,
          caption: texto
        })
      });

      if (!res.ok) throw new Error(`Servidor WA: ${await res.text()}`);

      await supabase.from('mensajes_wa').insert([{
        instance_name: instanceName,
        destinatario_nombre: alumno.nombres,
        destinatario_numero: cleanedNumber,
        mensaje_texto: texto,
        tipo_mensaje: 'Recibo'
      }]);

      // 5. Incrementar consecutivo en la nube
      await supabase.from('configuracion_wa')
        .update({ ultimo_consecutivo_recibo: nuevoConsecutivo })
        .eq('id', config.id);

      toast.success(`Recibo #${nuevoConsecutivo} enviado 🚀`);
    } catch (error: any) {
      toast.error("Fallo al enviar: " + error.message);
      throw error; // Re-lanzar para que el proceso batch sepa que falló
    } finally {
      setLoadingBot(null);
    }
  };

  const ingresosRecaudados = historialPagos.reduce((acc, pago) => acc + parseFloat(pago.total || 0), 0);
  const egresosTotales = egresos.reduce((acc, eg) => acc + parseFloat(eg.monto || 0), 0);
  const utilidadNeta = ingresosRecaudados - egresosTotales;
  
  const totalJugadoresCobrales = jugadores.filter(j => calcularTarifa(j.tipo_plan) > 0).length;
  
  // Mapeo de quiénes pagaron este mes para rapidez
  const mesActual = hoy.getMonth() + 1;
  const anioActual = hoy.getFullYear();
  
  const idsPagadosEsteMes = new Set(
    historialPagos
      .filter(p => {
        const fechaPago = new Date(p.fecha);
        return (fechaPago.getMonth() + 1) === mesActual && fechaPago.getFullYear() === anioActual;
      })
      .map(p => p.jugador_id)
  );

  const jugadoresFin = jugadores.map(j => {
    const tarifa = calcularTarifa(j.tipo_plan);
    const esAlDia = idsPagadosEsteMes.has(j.id);
    return { ...j, esAlDia, tarifa };
  });

  const totalAlDia = jugadoresFin.filter(j => j.esAlDia && j.tarifa > 0).length;
  const totalMora = totalJugadoresCobrales - totalAlDia;
  
  const ingresosPendientes = jugadoresFin
    .filter(j => !j.esAlDia && j.tarifa > 0)
    .reduce((acc, j) => acc + j.tarifa, 0);

  const porcentajeRecaudo = totalJugadoresCobrales > 0 ? Math.round((totalAlDia / totalJugadoresCobrales) * 100) : 0;

  const jugadoresFiltrados = jugadoresFin.filter(jugador => {
    const estadoActual = jugador.esAlDia ? 'Al día' : 'Pendiente';
    const coincideEstado = estadoFiltro === 'Todos' || estadoFiltro === estadoActual;
    const coincideBusqueda = `${jugador.nombres} ${jugador.apellidos}`.toLowerCase().includes(busqueda.toLowerCase());
    return coincideEstado && coincideBusqueda;
  });

  const enviarReciboAutomatico = async () => {
    if (!reciboGenerado) return;
    
    const toastId = toast.loading("Generando y enviando recibo oficial...");
    setLoadingBot('manual'); // Usamos un id virtual para el loader

    try {
      const { data: config } = await supabase.from('configuracion_wa').select('*').single();
      if (!config || !config.api_url) throw new Error("Configura el asistente de WhatsApp primero.");

      const cleanUrl = config.api_url.endsWith('/') ? config.api_url.slice(0, -1) : config.api_url;
      const instanceName = config.instance_name || 'Gibbor_App';

      // 1. Limpiar número
      let cleanedNumber = String(reciboGenerado.telefono || '').replace(/\D/g, '');
      if (cleanedNumber.length === 10) cleanedNumber = `57${cleanedNumber}`;

      // 2. Generar PDF Profesional con los datos del recibo manual
      const doc = new jsPDF();
      
      try {
        doc.addImage('/logo.png', 'PNG', 15, 15, 25, 25);
      } catch (e) {}

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text('EFD GIBBOR', 45, 25);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(config.direccion || 'Sede Deportiva Central', 45, 30);
      doc.text(config.ciudad || 'Colombia', 45, 34);
      
      doc.setFillColor(34, 197, 94); // Verde éxito
      doc.rect(145, 15, 50, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text('PAGO CONFIRMADO', 170, 21.5, { align: 'center' });

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.text(`Fecha: ${new Date(reciboGenerado.fecha).toLocaleDateString()}`, 145, 30);
      doc.text(`Recibo: #${reciboGenerado.consecutivo.toString().padStart(4, '0')}`, 145, 34);

      doc.setDrawColor(240, 240, 240);
      doc.line(15, 45, 195, 45);

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, 50, 180, 20, 3, 3, 'F');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('RECIBIDO DE', 20, 56);
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(`${reciboGenerado.nombres} ${reciboGenerado.apellidos}`.toUpperCase(), 20, 63);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Categoría: ${reciboGenerado.grupo}`, 100, 68);

      // Tabla de cobro
      doc.setFillColor(30, 41, 59);
      doc.rect(15, 75, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('DESCRIPCIÓN DEL PAGO', 20, 80.5);
      doc.text('MONTO', 175, 80.5, { align: 'right' });

      doc.setTextColor(30, 41, 59);
      doc.text(`Mensualidad Deportiva / Cuota Plan`, 20, 92);
      doc.text(`$ ${reciboGenerado.montoBase.toLocaleString()}`, 175, 92, { align: 'right' });
      
      if (reciboGenerado.descuento > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`Descuento Aplicado`, 20, 98);
        doc.text(`- $ ${reciboGenerado.descuento.toLocaleString()}`, 175, 98, { align: 'right' });
      }
      if (reciboGenerado.recargo > 0) {
        doc.setTextColor(30, 41, 59);
        doc.text(`Recargo / Otros`, 20, 104);
        doc.text(`+ $ ${reciboGenerado.recargo.toLocaleString()}`, 175, 104, { align: 'right' });
      }
      
      doc.line(15, 110, 195, 110);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129);
      doc.text('TOTAL RECIBIDO:', 120, 120);
      doc.text(`$ ${reciboGenerado.total.toLocaleString()}`, 180, 120, { align: 'right' });

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('EFD GIBBOR - Formando Grandes Talentos. Este es un comprobante de pago oficial.', 105, 200, { align: 'center' });

      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const texto = `¡Hola! ⚽ EFD Gibbor confirma el recibo de tu pago № ${reciboGenerado.consecutivo.toString().padStart(4, '0')} por un valor de $${reciboGenerado.total.toLocaleString()}. Aquí tienes tu comprobante oficial en PDF. ✨`;

      // 3. Envío vía API
      const res = await fetch(`${cleanUrl}/message/sendMedia/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': config.api_key },
        body: JSON.stringify({
          number: cleanedNumber,
          media: pdfBase64,
          mediatype: "document",
          mimetype: "application/pdf",
          fileName: `Recibo_${reciboGenerado.nombres.replace(/\s/g, '_')}_${reciboGenerado.consecutivo}.pdf`,
          caption: texto
        })
      });

      if (!res.ok) throw new Error("Error en servidor de WhatsApp");

      toast.success("Recibo enviado correctamente al alumno 🚀", { id: toastId });
      setReciboGenerado(null); // Cerramos tras éxito
    } catch (err: any) {
      toast.error("Error al enviar: " + err.message, { id: toastId });
    } finally {
      setLoadingBot(null);
    }
  };

  const generarYCompartirPDF = async () => {
    if (!reciboGenerado) return;
    const toastId = toast.loading("Preparando recibo...");
    try {
      const doc = new jsPDF();
      try { doc.addImage('/logo.png', 'PNG', 15, 15, 25, 25); } catch (e) {}

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text('EFD GIBBOR', 45, 25);
      
      doc.setFontSize(10);
      doc.text('COMPROBANTE DE PAGO', 45, 32);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.text(`Fecha: ${new Date(reciboGenerado.fecha).toLocaleDateString()}`, 145, 30);
      doc.text(`Recibo: #${reciboGenerado.consecutivo.toString().padStart(4, '0')}`, 145, 34);

      doc.line(15, 45, 195, 45);
      doc.text(`Recibido de: ${reciboGenerado.nombres} ${reciboGenerado.apellidos}`, 20, 60);
      doc.text(`Monto Total: $ ${reciboGenerado.total.toLocaleString()}`, 20, 70);
      doc.text(`Método: ${reciboGenerado.metodo}`, 20, 80);

      const pdfBlob = doc.output('blob');
      const filename = `Recibo_${reciboGenerado.nombres.replace(/\s/g, '_')}.pdf`;
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        toast.dismiss(toastId);
        await navigator.share({ files: [file], title: 'Recibo Gibbor' });
      } else {
        doc.save(filename);
        toast.success("Recibo descargado.", { id: toastId });
      }
    } catch (err: any) {
      toast.error("Error al procesar", { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      <div className="p-4 md:p-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Wallet className="text-emerald-500 w-7 h-7" /> Cobranza y Finanzas
            </h1>
            <p className="text-sm text-slate-500 mt-1">Control de pagos, planes dinámicos y recordatorios.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/director/cobranza/planes')} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-2">
              <Settings className="w-4 h-4" /> Gestión de Planes
            </button>
          </div>
        </div>

        {/* Banner de Asistente Inteligente */}
        {automatedTasks.length > 0 && isBannerVisible && (
          <div className="mb-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-1 shadow-lg shadow-orange-100 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-24 h-24 text-white" />
            </div>
            <div className="bg-white/95 backdrop-blur-sm rounded-[14px] p-5 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center animate-pulse">
                  <Bot className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    Asistente Gibbor <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Hoy</span>
                  </h3>
                  <p className="text-sm text-slate-500">He detectado <span className="font-bold text-orange-600">{automatedTasks.length} cobros programados</span> para hoy que no han sido notificados.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setIsBannerVisible(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Omitir por ahora
                </button>
                <button 
                  onClick={handleSendBatch}
                  disabled={isSendingBatch}
                  className="flex-1 md:flex-none bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white px-6 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                >
                  {isSendingBatch ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando ({batchProgress}/{automatedTasks.length})
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      Enviar todos ({automatedTasks.length})
                    </>
                  )}
                </button>
              </div>
            </div>
            {isSendingBatch && (
              <div className="h-1 bg-orange-200 w-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 transition-all duration-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
                  style={{ width: `${(batchProgress / automatedTasks.length) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800">Ciclo de Facturación Activo</p>
              <p className="text-xs text-slate-500">Hoy es día <span className="font-black text-slate-700">{diaActual}</span>. Los descuentos de pronto pago se aplican según la configuración de cada plan.</p>
            </div>
          </div>
          <div className="hidden md:flex gap-2">
             <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">Sistema Automatizado</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingresos Reales</p>
            <h3 className="text-2xl font-black text-emerald-600">${ingresosRecaudados.toLocaleString('es-CO')}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Egresos (Gastos)</p>
            <h3 className="text-2xl font-black text-red-500">${egresosTotales.toLocaleString('es-CO')}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilidad Neta</p>
            <h3 className={`text-2xl font-black ${utilidadNeta >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              ${utilidadNeta.toLocaleString('es-CO')}
            </h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Por Cobrar</p>
            <h3 className="text-2xl font-black text-slate-400">${ingresosPendientes.toLocaleString('es-CO')}</h3>
          </div>
        </div>

        {/* SWITCH DE PESTAÑAS */}
        <div className="mt-8 flex border-b border-slate-200">
           <button onClick={() => setActiveTab('ingresos')} className={`px-8 py-4 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'ingresos' ? 'border-b-4 border-emerald-500 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Ingresos</button>
           <button onClick={() => setActiveTab('egresos')} className={`px-8 py-4 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'egresos' ? 'border-b-4 border-red-500 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Egresos / Gastos</button>
        </div>

        {activeTab === 'ingresos' ? (
          <>
            <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input type="text" placeholder="Buscar alumno por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                </div>
                <div className="flex gap-2">
                  {['Todos', 'Pendiente', 'Al día'].map(label => (
                    <button key={label} onClick={() => setEstadoFiltro(label)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${estadoFiltro === label ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                      <th className="p-4 md:px-6">Alumno</th>
                      <th className="p-4 md:px-6">Categoría</th>
                      <th className="p-4 md:px-6">Plan</th>
                      <th className="p-4 md:px-6">Valor</th>
                      <th className="p-4 md:px-6">Estado</th>
                      <th className="p-4 md:px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {cargando ? (
                      <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">Cargando futbolistas...</td></tr>
                    ) : jugadoresFiltrados.length === 0 ? (
                      <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">No se encontraron resultados.</td></tr>
                    ) : (
                      jugadoresFiltrados.map((jugador) => {
                        const esAlDia = jugador.esAlDia;
                        return (
                          <tr key={jugador.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-4 md:px-6">
                              <p className="font-bold text-slate-800 uppercase tracking-tight">{jugador.nombres} {jugador.apellidos}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{jugador.email_contacto || 'Sin correo'}</p>
                            </td>
                            <td className="p-4 md:px-6 font-medium text-slate-600 uppercase text-xs">{jugador.grupos || 'Ninguna'}</td>
                            <td className="p-4 md:px-6">
                              <select value={jugador.tipo_plan || 'Regular'} onChange={(e) => actualizarPlan(jugador.id, e.target.value, `${jugador.nombres} ${jugador.apellidos}`)} className="bg-slate-100 border-none text-[11px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer focus:ring-1 focus:ring-slate-300">
                                {planes.map(p => (
                                  <option key={p.id} value={p.nombre}>{p.nombre} (${Number(p.precio_base).toLocaleString('es-CO')})</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-4 md:px-6 font-black text-slate-700">${jugador.tarifa.toLocaleString('es-CO')}</td>
                            <td className="p-4 md:px-6">
                              {jugador.tarifa === 0 ? (
                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">Beca</span>
                              ) : (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${esAlDia ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                  {esAlDia ? 'Al día' : 'Pendiente'}
                                </span>
                              )}
                            </td>
                            <td className="p-4 md:px-6 text-right">
                              <div className="flex justify-end gap-2">
                                {jugador.tarifa === 0 ? (
                                  <span className="text-slate-400 text-xs font-medium italic">No requiere cobro</span>
                                ) : !esAlDia ? (
                                  <>
                                    <button 
                                      onClick={() => handleNotificar(jugador)} 
                                      disabled={loadingBot !== null}
                                      className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 text-xs font-bold" 
                                      title="Invocar Robot de Cobro"
                                    >
                                      {loadingBot === jugador.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                                      {loadingBot === jugador.id ? 'Enviando...' : 'Notificar'}
                                    </button>
                                    <button onClick={() => abrirModalPago(jugador)} className="bg-white border border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                                      Pagar
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100 flex items-center gap-1.5">
                                      <CheckCircle className="w-4 h-4" /> Pagado
                                    </span>
                                    <button onClick={() => abrirModalPago(jugador)} className="text-slate-300 hover:text-emerald-500 transition-colors p-1" title="Registrar otro pago">
                                      <PlusCircle className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-400">COBRO DÍA:</span>
                                  <select 
                                    defaultValue={jugador.dia_pago || 1}
                                    onChange={(e) => actualizarDiaPago(jugador.id, parseInt(e.target.value))}
                                    className="text-[10px] font-bold bg-slate-50 border-none rounded px-1.5 py-0.5 text-orange-600 focus:ring-0 cursor-pointer hover:bg-orange-50 transition-colors"
                                  >
                                    {[...Array(30)].map((_, i) => (
                                      <option key={i+1} value={i+1}>{i+1}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-12 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-20">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <ClipboardCheck className="text-emerald-500 w-6 h-6" /> Historial de Pagos Recibidos
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Consulta y re-imprime recibos de mensualidades anteriores.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                      <th className="p-4 md:px-6">№ Recibo</th>
                      <th className="p-4 md:px-6">Alumno</th>
                      <th className="p-4 md:px-6">Fecha de Pago</th>
                      <th className="p-4 md:px-6">Método</th>
                      <th className="p-4 md:px-6 text-right">Monto Total</th>
                      <th className="p-4 md:px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {historialPagos.length === 0 ? (
                      <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">No hay historial de ingresos registrado.</td></tr>
                    ) : (
                      historialPagos.map((pago) => (
                        <tr key={pago.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 md:px-6 font-black text-slate-900">№ {pago.consecutivo.toString().padStart(3, '0')}</td>
                          <td className="p-4 md:px-6 font-bold text-slate-800 uppercase tracking-tight">{pago.nombres} {pago.apellidos}</td>
                          <td className="p-4 md:px-6 text-slate-600 font-medium">{new Date(pago.fecha).toLocaleDateString('es-CO')}</td>
                          <td className="p-4 md:px-6 uppercase font-bold text-[10px] text-slate-500">{pago.metodo_pago}</td>
                          <td className="p-4 md:px-6 text-right font-black text-emerald-600">${parseFloat(pago.total || "0").toLocaleString('es-CO')}</td>
                          <td className="p-4 md:px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => { setReciboGenerado({ ...pago, montoBase: pago.monto_base, metodo: pago.metodo_pago }); }} className="bg-white border border-slate-300 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2">
                                <Printer className="w-3.5 h-3.5" /> Reimprimir
                              </button>
                              <button onClick={() => eliminarPagoHistorial(pago.id, pago.consecutivo)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-8">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <Trash2 className="text-rose-500 w-6 h-6" /> Registro de Egresos
                </h2>
                <button onClick={() => setIsModalEgresoOpen(true)} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition-all uppercase tracking-widest">
                   <PlusCircle className="w-4 h-4" /> Registrar Gasto
                </button>
             </div>

             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                                <th className="p-4 md:px-6">Descripción</th>
                                <th className="p-4 md:px-6">Categoría</th>
                                <th className="p-4 md:px-6">Fecha</th>
                                <th className="p-4 md:px-6 text-right">Monto</th>
                                <th className="p-4 md:px-6 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {egresos.length === 0 ? (
                                <tr><td colSpan={5} className="p-20 text-center text-slate-400 italic font-medium">No hay gastos registrados este periodo.</td></tr>
                            ) : (
                                egresos.map(eg => (
                                    <tr key={eg.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 md:px-6 font-bold text-slate-800 uppercase">{eg.descripcion}</td>
                                        <td className="p-4 md:px-6">
                                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold uppercase">{eg.categoria}</span>
                                        </td>
                                        <td className="p-4 md:px-6 text-slate-500">{new Date(eg.fecha).toLocaleDateString('es-CO')}</td>
                                        <td className="p-4 md:px-6 text-right font-black text-rose-600">${parseFloat(eg.monto).toLocaleString('es-CO')}</td>
                                        <td className="p-4 md:px-6 text-right">
                                            <button onClick={() => eliminarEgreso(eg.id)} className="text-slate-300 hover:text-rose-500 p-2 transition-colors">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
          </div>
        )}
      </div>

      {reciboGenerado && (
        <div className="hidden print:flex fixed inset-0 bg-white z-[9999] justify-center pt-8 font-sans pb-10">
          <div className="w-[21.5cm] h-[14cm] border-2 border-emerald-800 p-6 relative flex flex-col outline outline-4 outline-offset-2 outline-emerald-50 bg-white shadow-none">
            <div className="flex justify-between items-start mb-4">
               <div className="flex items-center gap-4">
                <img src="/logo.png" alt="Gibbor" className="w-20 h-20 object-contain rounded-full border border-slate-200" />
                <div>
                  <h1 className="text-2xl font-black text-orange-600 tracking-tight uppercase">EFD GIBBOR</h1>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Comprobante de Ingreso</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-emerald-800 uppercase italic">Recibo Oficial</p>
                <p className="text-2xl font-black text-slate-900">№ {reciboGenerado.consecutivo.toString().padStart(3, '0')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 mb-6 border-y border-slate-200 py-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Recibido de:</p>
                <p className="text-sm font-black text-slate-800 uppercase">{reciboGenerado.nombres} {reciboGenerado.apellidos}</p>
                <p className="text-xs text-slate-500 mt-1">Categoría: {reciboGenerado.grupo}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Fecha de pago:</p>
                <p className="text-sm font-bold text-slate-800 uppercase">{new Date(reciboGenerado.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric'})}</p>
                <p className="text-xs text-slate-500 mt-1">Método: {reciboGenerado.metodo}</p>
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Monto Base:</span>
                  <span>${reciboGenerado.montoBase.toLocaleString('es-CO')}</span>
                </div>
                {reciboGenerado.descuento > 0 && (
                  <div className="flex justify-between text-xs font-bold text-red-500">
                    <span>Descuento:</span>
                    <span>- ${reciboGenerado.descuento.toLocaleString('es-CO')}</span>
                  </div>
                )}
                <div className="border-t border-slate-300 pt-2 flex justify-between text-lg font-black text-slate-900">
                  <span>TOTAL PAGADO:</span>
                  <span>${reciboGenerado.total.toLocaleString('es-CO')}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-between items-end">
              <div className="text-[10px] text-slate-400 max-w-xs italic">* Este documento es un comprobante digital de pago emitido por la Escuela Deportiva Gibbor. Consérvelo para cualquier reclamación.</div>
              <div className="border-t border-slate-400 w-48 text-center pt-1"><p className="text-[10px] font-bold text-slate-600 uppercase">Firma Autorizada</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de confirmación post-pago */}
      {reciboGenerado && !isModalPagoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col text-center p-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">¡Pago Exitoso!</h3>
            <p className="text-slate-500 mb-8 text-sm">El pago de <strong>{reciboGenerado.nombres}</strong> por ${reciboGenerado.total.toLocaleString('es-CO')} se registró correctamente.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={enviarReciboAutomatico} 
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 animate-bounce-subtle"
              >
                <Bot className="w-5 h-5" /> Enviar Recibo al WhatsApp (Auto)
              </button>
              
              <button onClick={generarYCompartirPDF} className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                <MessageSquare className="w-5 h-5" /> Compartir PDF Individualmente
              </button>

              <button onClick={() => window.print()} className="w-full bg-slate-50 text-slate-500 font-bold py-3 rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2 hidden md:flex">
                <Printer className="w-4 h-4" /> Imprimir Recibo
              </button>
              
              <button onClick={() => setReciboGenerado(null)} className="w-full bg-transparent text-slate-400 text-xs font-bold py-3 hover:text-slate-600 transition-colors">
                Finalizar sin enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalPagoOpen && jugadorSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto max-h-[95vh] relative">
            <button onClick={() => setIsModalPagoOpen(false)} className="absolute top-4 right-4 z-10 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            <div className="w-full md:w-72 bg-slate-50 border-r border-slate-200 p-6 space-y-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-blue-600"><UserCircle className="w-5 h-5" /><p className="text-xs font-bold uppercase tracking-wider">Cliente</p></div>
                <p className="font-black text-slate-800 text-sm">{jugadorSeleccionado.nombres} {jugadorSeleccionado.apellidos}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-orange-500"><CreditCard className="w-5 h-5" /><p className="text-xs font-bold uppercase tracking-wider">Plan</p></div>
                <p className="text-sm font-bold text-slate-800">${calcularTarifa(jugadorSeleccionado.tipo_plan).toLocaleString('es-CO')}</p>
              </div>
            </div>
            <div className="flex-1 p-6 md:p-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Fecha de Pago</label>
                  <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Método de Pago</label>
                  <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-white">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                    <option value="Nequi / Daviplata">Nequi / Daviplata</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Descuento</label>
                  <input type="number" value={descuento} onChange={(e) => setDescuento(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg font-bold text-red-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Recargo</label>
                  <input type="number" value={recargo} onChange={(e) => setRecargo(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg font-bold text-emerald-600" />
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mb-8 flex justify-between items-center">
                 <p className="text-emerald-800 font-black text-lg">Total a Cobrar:</p>
                 <p className="text-3xl font-black text-emerald-600">${(calcularTarifa(jugadorSeleccionado.tipo_plan) - descuento + recargo).toLocaleString('es-CO')}</p>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsModalPagoOpen(false)} className="px-8 py-3.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 border border-slate-200">Cancelar</button>
                <button onClick={confirmarPago} className="px-10 py-3.5 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200">Confirmar Pago</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalEgresoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-8">
                <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-tight">
                    Nuevo Gasto
                </h3>
                
                <div className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Concepto / Descripción</label>
                        <input type="text" value={descEgreso} onChange={(e) => setDescEgreso(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold" placeholder="Ej: Renta de canchas Enero" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto ($)</label>
                        <input type="number" value={montoEgreso} onChange={(e) => setMontoEgreso(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold" placeholder="0" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Categoría</label>
                        <select value={catEgreso} onChange={(e) => setCatEgreso(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold bg-white">
                            <option value="Nómina">Nómina (Profesores)</option>
                            <option value="Renta">Renta de Canchas</option>
                            <option value="Materiales">Materiales y Balones</option>
                            <option value="Mantenimiento">Mantenimiento</option>
                            <option value="Otros">Otros</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={() => setIsModalEgresoOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                    <button onClick={registrarEgreso} className="flex-1 px-4 py-3 rounded-xl font-black text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-100 transition-all">Registrar Gasto</button>
                </div>
            </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; }
          .print\:hidden { display: none !important; }
          @page { margin: 0; size: letter portrait; }
        }
      `}} />
    </div>
  );
}