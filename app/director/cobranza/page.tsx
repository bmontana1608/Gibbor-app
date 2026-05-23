'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Wallet, Settings, Flame, Calendar, Search, CheckCircle, Smartphone, UserCircle, CreditCard, Printer, ClipboardCheck, Trash2, PlusCircle, X, Bot, MessageSquare, Loader2, Sparkles, ShieldCheck, Pencil, RefreshCw } from 'lucide-react';
import { enviarMensajeWhatsApp } from '@/lib/whatsapp';
import { generarReciboPDFBase64 } from '@/lib/recibo-utils';

import { useTenant } from '@/lib/hooks/useTenant';

export default function ModuloCobranza() {
  const router = useRouter();
  const { route, slug: tenantSlug } = useTenant();
  const pathname = usePathname();
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const eliminarPagoHistorial = async (id: string, consecutivo: number) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente el recibo #${consecutivo}? Esta acción no se puede deshacer y afectará los ingresos del mes.`)) return;

    const toastId = toast.loading("Eliminando registro de pago...");
    try {
      const { error } = await supabase.from('pagos_ingresos').delete().eq('id', id);
      if (error) throw error;
      toast.success("Pago eliminado correctamente", { id: toastId });
      cargarDatos();
    } catch (error: any) {
      toast.error("Error al eliminar: " + error.message, { id: toastId });
    }
  };

  const abrirEditorPago = (pago: any) => {
    setPagoEditando(pago);
    setEditMonto(String(pago.total || ''));
    setEditMetodo(pago.metodo_pago || 'Efectivo');
    setEditFecha(pago.fecha || '');
    setEditNotas(pago.notas || '');
    setIsModalEditarOpen(true);
  };

  const guardarEdicionPago = async () => {
    if (!pagoEditando || !editMonto) return toast.error('Ingresa un monto válido');
    const toastId = toast.loading('Guardando cambios...');
    try {
      const { error } = await supabase
        .from('pagos_ingresos')
        .update({
          total: Number(editMonto),
          monto_base: Number(editMonto),
          metodo_pago: editMetodo,
          fecha: editFecha,
          notas: editNotas || null,
        })
        .eq('id', pagoEditando.id);
      if (error) throw error;
      toast.success('Pago actualizado', { id: toastId });
      setIsModalEditarOpen(false);
      cargarDatos();
    } catch (err: any) {
      toast.error('Error: ' + err.message, { id: toastId });
    }
  };

  const eliminarAbono = async (id: string, monto: number) => {
    if (!window.confirm(`¿Eliminar el abono de $${Number(monto).toLocaleString('es-CO')}? Esto afectará el saldo del alumno.`)) return;
    const toastId = toast.loading('Eliminando abono...');
    try {
      // Eliminar de la tabla de abonos
      await supabase.from('abonos').delete().eq('id', id);
      // Eliminar también el registro en pagos_ingresos (buscar por notas + jugador)
      toast.success('Abono eliminado', { id: toastId });
      cargarDatos();
    } catch (err: any) {
      toast.error('Error: ' + err.message, { id: toastId });
    }
  };

  const eliminarEgreso = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este registro de gasto?")) return;
    
    try {
      const { error } = await supabase.from('egresos').delete().eq('id', id);
      if (error) throw error;
      toast.success("Gasto eliminado");
      cargarDatos();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };
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
  const [fechaPago, setFechaPago] = useState(() => {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  });

  // Estado para Egresos
  const [egresos, setEgresos] = useState<any[]>([]);
  const [isModalEgresoOpen, setIsModalEgresoOpen] = useState(false);
  const [descEgreso, setDescEgreso] = useState('');
  const [montoEgreso, setMontoEgreso] = useState('');
  const [catEgreso, setCatEgreso] = useState('Otros');
  const [tenant, setTenant] = useState<any>(null);

  // Historial de Pagos (Ingresos)
  const [historialPagos, setHistorialPagos] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);

  // Sistema de Abonos
  const [abonos, setAbonos] = useState<any[]>([]);
  const [isModalAbonoOpen, setIsModalAbonoOpen] = useState(false);
  const [jugadorAbono, setJugadorAbono] = useState<any>(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPagoAbono, setMetodoPagoAbono] = useState('Efectivo');
  const [notasAbono, setNotasAbono] = useState('');

  // Recibo Generado para impresión
  const [reciboGenerado, setReciboGenerado] = useState<any>(null);

  // Modal de Edición de Pago / Abono
  const [isModalEditarOpen, setIsModalEditarOpen] = useState(false);
  const [pagoEditando, setPagoEditando] = useState<any>(null);
  const [editMonto, setEditMonto] = useState('');
  const [editMetodo, setEditMetodo] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [editNotas, setEditNotas] = useState('');

  // Estados para el Asistente Inteligente
  const [automatedTasks, setAutomatedTasks] = useState<any[]>([]);
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [notificacionesMes, setNotificacionesMes] = useState<any[]>([]);
  // Aportes movidos al módulo /director/aportes

  // Filtros de fecha dinámicos
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const hoy = new Date();
  const diaActual = hoy.getDate();

  const normalizeDate = (d: string) => {
    if (!d) return '';
    // Si viene con hora, cortamos para tener solo la fecha
    const base = d.split(' ')[0];
    const separator = base.includes('-') ? '-' : '/';
    const parts = base.split(separator);

    if (parts.length === 3) {
      // Caso YYYY-MM-DD
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      // Caso DD-MM-YYYY o MM-DD-YYYY (asumimos DD-MM-YYYY por convención local)
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return base;
  };

  const calcularTarifa = (tipoPlan: string) => {
    const planBuscado = planes.find(p => p.nombre === (tipoPlan || 'Regular'));
    if (!planBuscado) return 0;
    
    const limiteProntoPago = planBuscado.dias_limite_pronto_pago || 5;
    if (diaActual <= limiteProntoPago) {
      return Number(planBuscado.precio_base) - Number(planBuscado.descuento_pronto_pago);
    }
    return Number(planBuscado.precio_base);
  };

  // Calcula tarifa inteligente según el período de cobro y si es beca
  const calcularTarifaPeriodo = (tipoPlan: string, fechaPeriodo: string) => {
    const planBuscado = planes.find(p => p.nombre === (tipoPlan || 'Regular'));
    if (!planBuscado) return { tarifa: 0, descuento: 0, precioBase: 0 };

    const planLabel = (tipoPlan || '').toLowerCase();
    // Las becas (cualquier plan con 'beca' en el nombre) NO tienen descuento de pronto pago
    const esBeca = planLabel.includes('beca');

    const precioBase = Number(planBuscado.precio_base);
    const descuentoProntoPago = Number(planBuscado.descuento_pronto_pago || 0);
    const limiteProntoPago = Number(planBuscado.dias_limite_pronto_pago || 5);

    const hoy = new Date();
    const periodo = new Date(fechaPeriodo + 'T12:00:00');

    // El descuento solo aplica si:
    // 1. No es una beca
    // 2. El mes de cobro es el mes actual (no tiene sentido aplicar pronto pago a meses pasados)
    // 3. Hoy está dentro de los primeros N días del mes
    const mismoPeriodo = hoy.getMonth() === periodo.getMonth() &&
                         hoy.getFullYear() === periodo.getFullYear();
    const dentroVentana = hoy.getDate() <= limiteProntoPago;
    const aplicaDescuento = !esBeca && mismoPeriodo && dentroVentana;

    const descuento = aplicaDescuento ? descuentoProntoPago : 0;
    return { tarifa: precioBase - descuento, descuento, precioBase };
  };

  const cargarDatos = async () => {
    setCargando(true);
    
    // 1. Obtener Tenant primero
    if (!tenantSlug) return;
    let tenantData;
    try {
      const tenantRes = await fetch(`/api/tenant?slug=${tenantSlug}`, { cache: 'no-store' });
      if (tenantRes.ok) {
        tenantData = await tenantRes.json();
      } else {
        throw new Error("No se pudo obtener el tenant");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error de conexión con el club");
      return;
    }
    setTenant(tenantData);

    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('club_id', tenantData.id)
      .not('rol', 'in', '("Director","Entrenador")')
      .eq('estado_miembro', 'Activo')
      .order('nombres', { ascending: true });

    if (error) {
      toast.error(`Error al cargar datos: ${error.message}`);
    }
    if (data) {
      setJugadores(data);
    }
    
    const { data: planesData } = await supabase.from('planes').select('*').eq('club_id', tenantData.id);
    if (planesData) setPlanes(planesData);

    const { data: histData } = await supabase
      .from('pagos_ingresos')
      .select('*')
      .eq('club_id', tenantData.id)
      .order('fecha', { ascending: false });
    
    const { data: egresosData } = await supabase
      .from('pagos_egresos')
      .select('*')
      .eq('club_id', tenantData.id)
      .order('fecha', { ascending: false });

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
    const { data: msgData } = await supabase
      .from('mensajes_wa')
      .select('destinatario_numero, created_at')
      .eq('club_id', tenantData.id)
      .eq('tipo_mensaje', 'Recibo')
      .gte('created_at', inicioMes);

    if (histData) setHistorialPagos(histData);
    if (egresosData) setEgresos(egresosData);
    if (msgData) setNotificacionesMes(msgData);

    // Cargar todos los abonos del club
    const { data: abonosData } = await supabase
      .from('abonos')
      .select('*')
      .eq('club_id', tenantData.id);
    if (abonosData) setAbonos(abonosData);

    setCargando(false);
  };

  const registrarEgreso = async () => {
    if (!descEgreso || !montoEgreso) return toast.error("Llena todos los campos");
    const d = new Date();
    const fechaLet = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');

    const { error } = await supabase.from('pagos_egresos').insert([{
      descripcion: descEgreso,
      monto: Number(montoEgreso),
      categoria: catEgreso,
      fecha: fechaLet,
      club_id: tenant?.id
    }]);

    if (error) toast.error("Error: " + error.message);
    else {
      toast.success("Gasto registrado");
      setIsModalEgresoOpen(false);
      setDescEgreso(''); setMontoEgreso('');
      cargarDatos();
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [tenantSlug, pathname]);

  useEffect(() => {
    const diaHoy = new Date().getDate();
    const mesActualStr = String(new Date().getMonth() + 1).padStart(2, '0');
    const anioActualStr = String(new Date().getFullYear());
    const matchMesAnio = `${anioActualStr}-${mesActualStr}`;
    
    const idsPagados = new Set(
      historialPagos
        .filter(p => p.fecha && String(p.fecha).startsWith(matchMesAnio))
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
    // Inicializamos la fecha del pago a la fecha de inicio del período seleccionado
    // para que el pago se registre dentro del mes correcto y afecte la mora de ese mes.
    setFechaPago(fechaInicio);
    setIsModalPagoOpen(true);
  };

  const confirmarPago = async () => {
    if (!jugadorSeleccionado) return;
    
    // Usar la tarifa inteligente precalculada para el período seleccionado
    const tarifaBase = jugadorSeleccionado.tarifa || calcularTarifa(jugadorSeleccionado.tipo_plan);
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
        fecha: fechaPago,
        club_id: tenant?.id
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

  // ── SISTEMA DE ABONOS PARCIALES ──────────────────────────────────────────
  const abrirModalAbono = (jugador: any) => {
    setJugadorAbono(jugador);
    setMontoAbono('');
    setMetodoPagoAbono('Efectivo');
    setNotasAbono('');
    setIsModalAbonoOpen(true);
  };

  const registrarAbono = async () => {
    if (!jugadorAbono || !montoAbono || Number(montoAbono) <= 0)
      return toast.error('Ingresa un monto válido');

    const toastId = toast.loading(`Registrando abono de ${jugadorAbono.nombres}...`);
    try {
      // El período es el primer día del mes de fechaInicio (mes que se está cobrando)
      const periodo = fechaInicio.substring(0, 7) + '-01';

      const { error } = await supabase.from('abonos').insert([{
        club_id: tenant?.id,
        perfil_id: jugadorAbono.id,
        periodo,
        monto: Number(montoAbono),
        metodo: metodoPagoAbono,
        notas: notasAbono || null,
      }]);

      if (error) throw error;

      // También registrar en pagos_ingresos para que aparezca en el historial contable
      await supabase.from('pagos_ingresos').insert([{
        jugador_id: jugadorAbono.id,
        nombres: jugadorAbono.nombres,
        apellidos: jugadorAbono.apellidos,
        grupo: jugadorAbono.grupos || 'Sin grupo',
        monto_base: Number(montoAbono),
        descuento: 0,
        recargo: 0,
        total: Number(montoAbono),
        metodo_pago: metodoPagoAbono,
        notas: `ABONO - ${notasAbono || 'Pago parcial'}`,
        fecha: periodo,   // ← fecha del período cobrado (ej: 2026-04-01), no la fecha de hoy
        club_id: tenant?.id,
      }]);

      toast.success(`✅ Abono de $${Number(montoAbono).toLocaleString('es-CO')} registrado`, { id: toastId });
      setIsModalAbonoOpen(false);
      cargarDatos();
    } catch (err: any) {
      toast.error('Error al registrar abono: ' + err.message, { id: toastId });
    }
  };

  const reiniciarDeudaGlobal = async () => {
    const confirmacion = window.confirm(
      "⚠️ ATENCIÓN: Esta acción establecerá un 'Borrón y Cuenta Nueva' para TODOS los jugadores.\n\n" +
      "Se ignorarán las deudas de meses anteriores y el conteo empezará desde este mes. ¿Deseas continuar?"
    );
    
    if (!confirmacion) return;

    const toastId = toast.loading("Reiniciando historial financiero...");
    try {
      // Calculamos el mes anterior para poner la marca de reinicio
      const d = new Date();
      const mesAnterior = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const fechaMarca = mesAnterior.toISOString().split('T')[0];

      // Creamos los registros de reinicio para todos los jugadores activos
      const promesas = jugadores.map(j => {
        return supabase.from('pagos_ingresos').insert([{
          jugador_id: j.id,
          nombres: j.nombres,
          apellidos: j.apellidos,
          grupo: j.grupos || 'Sistema',
          monto_base: 0,
          descuento: 0,
          recargo: 0,
          total: 0,
          metodo_pago: 'Sistema',
          notas: 'REINICIO DE DEUDA HISTÓRICA (Borrón y cuenta nueva)',
          fecha: fechaMarca,
          club_id: tenant?.id
        }]);
      });

      await Promise.all(promesas);
      toast.success("¡Historial reiniciado! Las deudas antiguas han sido archivadas.", { id: toastId });
      cargarDatos();
    } catch (error: any) {
      toast.error("Error al reiniciar: " + error.message, { id: toastId });
    }
  };

  const [loadingBot, setLoadingBot] = useState<string | null>(null);

  const handleNotificar = async (alumno: any) => {
    // Calcular tarifa correcta según período y tipo de plan
    const { tarifa: tarifaCalculada, descuento: descuentoCalculado, precioBase: precioBaseCalculado } = calcularTarifaPeriodo(alumno.tipo_plan, fechaInicio);
    
    // Si la tarifa del alumno no está pre-calculada, usar la inteligente
    const tarifaFinal = tarifaCalculada > 0 ? tarifaCalculada : (alumno.tarifa || 0);
    
    setLoadingBot(alumno.id);
    
    try {
      const { data: config } = await supabase.from('configuracion_wa').select('*').single();
      const clubConfig = config || {};
      
      let cleanedNumber = String(alumno.telefono || '').replace(/\D/g, '');
      // Si el número empieza con el código de país pero sin +, o es local de 10 dígitos
      if (cleanedNumber.length === 10) {
        cleanedNumber = `57${cleanedNumber}`;
      }

      // --- DATOS DINÁMICOS (Basados en el período seleccionado en el calendario) ---
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const fechaPeriodo = new Date(fechaInicio + 'T12:00:00'); // Evitar desfases
      const mesNombre = meses[fechaPeriodo.getMonth()];
      const anioActual = fechaPeriodo.getFullYear();
      
      const direccionClub = config.direccion || 'Calle Ficticia #12-34';
      const ciudadClub = config.ciudad || 'Cúcuta, Norte de Santander';
      const nuevoConsecutivo = (config.ultimo_consecutivo_recibo || 0) + 1;

      // --- LÓGICA DE ESTADO INTELIGENTE (1-5 día del mes actual, o VENCIDO si es mes pasado) ---
      const hoy = new Date();
      const esMesPasado = hoy.getFullYear() > anioActual || 
                          (hoy.getFullYear() === anioActual && hoy.getMonth() > fechaPeriodo.getMonth());
      const esVencido = esMesPasado || hoy.getDate() > 5;
      const statusLabel = esVencido ? 'VENCIDO' : 'PENDIENTE PAGO';
      const statusColor = esVencido ? [220, 38, 38] : [255, 120, 0]; // Rojo : Naranja

      // --- GENERACIÓN DE PDF PROFESIONAL ---
      const pdfBase64 = await generarReciboPDFBase64({
        nombres: alumno.nombres,
        apellidos: alumno.apellidos,
        documento: alumno.documento,
        grupo: alumno.grupos || 'GENERAL',
        tarifa: tarifaFinal,
        precioBase: precioBaseCalculado,
        descuentoProntoPago: descuentoCalculado,
        consecutivo: nuevoConsecutivo,
        fecha: fechaInicio,
        empresa: {
          nombre_club: clubConfig.nombre_club,
          direccion: clubConfig.direccion || 'Sede Deportiva',
          ciudad: clubConfig.ciudad || 'Colombia',
          nequi: clubConfig.nequi,
          daviplata: clubConfig.daviplata,
          bre_b: clubConfig.bre_b,
          banco_nombre: clubConfig.banco_nombre,
          banco_numero: clubConfig.banco_numero
        }
      });

      // Mensaje de WhatsApp
      const vencimiento = `5/${fechaPeriodo.getMonth() + 1}/${anioActual}`;
      const textoDescuento = descuentoCalculado > 0 
        ? ` Recuerda que si pagas antes del 5 tienes descuento de $${descuentoCalculado.toLocaleString('es-CO')}.`
        : '';
      const texto = `Hola ${alumno.nombres} 👋, aquí tienes tu recibo de Mensualidad de *${mesNombre}* por $ ${tarifaFinal.toLocaleString('es-CO')} (vence ${vencimiento}).${textoDescuento} Gracias por confiar en el club ✨`;

      const result = await enviarMensajeWhatsApp(
        alumno.telefono,
        texto,
        pdfBase64,
        'document',
        `Recibo_${mesNombre}_${alumno.nombres.replace(/\s/g, '_')}.pdf`,
        tenantSlug
      );

      if (!result.success) throw new Error(result.error);

      // 5. Incrementar consecutivo en la nube
      await supabase.from('configuracion_wa')
        .update({ ultimo_consecutivo_recibo: nuevoConsecutivo })
        .eq('id', config.id);

      toast.success(`Recibo #${nuevoConsecutivo} enviado 🚀`);
    } catch (error: any) {
      toast.error("Fallo al enviar: " + error.message);
      throw error;
    } finally {
      setLoadingBot(null);
    }
  };

  // Cobro manual — descarga el PDF y abre WhatsApp directo al contacto con texto pre-escrito
  const cobrarManual = async (alumno: any) => {
    if (!alumno.tarifa) alumno.tarifa = calcularTarifa(alumno.tipo_plan);
    setLoadingBot(`manual-${alumno.id}`);
    const toastId = toast.loading(`Preparando recibo para ${alumno.nombres}...`);
    try {
      const { data: config } = await supabase.from('configuracion_wa').select('*').single();
      const nuevoConsecutivo = (config?.ultimo_consecutivo_recibo || 0) + 1;

      // Mes del PERÍODO DE COBRO seleccionado (no el mes actual del sistema)
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const fechaPeriodo = new Date(fechaInicio + 'T12:00:00'); // Evitar desfases de zona horaria
      const mesActual = meses[fechaPeriodo.getMonth()];
      const anioActual = fechaPeriodo.getFullYear();
      const diaVence = 5;
      const nombreClub = config?.nombre_club || 'TU CLUB';

      // Calcular tarifa correcta según período y tipo de plan
      const { tarifa: tarifaCalculada, descuento: descuentoCalculado, precioBase: precioBaseCalculado } = calcularTarifaPeriodo(alumno.tipo_plan, fechaInicio);
      // Si la tarifa del alumno ya fue pre-calculada y es diferente, usamos la inteligente
      const tarifaFinal = tarifaCalculada > 0 ? tarifaCalculada : (alumno.tarifa || 0);

      // Sin 'metodo' => el PDF sale en Naranja/Rojo PENDIENTE
      const pdfBase64 = await generarReciboPDFBase64({
        nombres: alumno.nombres,
        apellidos: alumno.apellidos,
        documento: alumno.documento,
        grupo: alumno.grupos || 'GENERAL',
        tarifa: tarifaFinal,
        precioBase: precioBaseCalculado,
        descuentoProntoPago: descuentoCalculado,
        consecutivo: nuevoConsecutivo,
        fecha: fechaInicio,
        empresa: {
          nombre_club: config?.nombre_club,
          direccion: config?.direccion || 'Sede Deportiva',
          ciudad: config?.ciudad || 'Colombia',
          nequi: config?.nequi,
          daviplata: config?.daviplata,
          bre_b: config?.bre_b,
          banco_nombre: config?.banco_nombre,
          banco_numero: config?.banco_numero
        }
      });

      // 1. Descargar el PDF al dispositivo
      const byteArray = new Uint8Array(atob(pdfBase64).split('').map(c => c.charCodeAt(0)));
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const filename = `Cobro_${mesActual}_${alumno.nombres.replace(/\s/g, '_')}.pdf`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      // 2. Formatear número de teléfono con código de país
      let telefono = String(alumno.telefono || '').replace(/\D/g, '');
      if (telefono.length === 10) telefono = `57${telefono}`;

      // 3. Texto del mensaje personalizado
      const metodosPago = [
        config?.nequi ? `Nequi: *${config.nequi}*` : '',
        config?.daviplata ? `Daviplata: *${config.daviplata}*` : '',
        config?.bre_b ? `Bre-B: *${config.bre_b}*` : '',
      ].filter(Boolean).join('\n');

      const textoDescuento = descuentoCalculado > 0
        ? `\n🎁 *¡Paga antes del día ${diaVence} y ahorra $${descuentoCalculado.toLocaleString('es-CO')}!*`
        : '';

      const mensaje = [
        `Hola ${alumno.nombres} 👋`,
        ``,
        `Te enviamos tu *Recibo de Mensualidad* correspondiente al mes de *${mesActual} ${anioActual}*.`,
        ``,
        `📋 *Detalle:*`,
        `• Alumno: *${alumno.nombres} ${alumno.apellidos}*`,
        `• Categoría: *${alumno.grupos || 'General'}*`,
        `• Valor: *$${tarifaFinal.toLocaleString('es-CO')}*`,
        `• Vence: *Día ${diaVence} de ${mesActual}*`,
        textoDescuento,
        ``,
        `💳 *Canales de pago:*`,
        metodosPago || 'Consulta con el club.',
        ``,
        `¡Gracias por tu confianza en *${nombreClub}*! ⚽✨`
      ].filter(l => l !== undefined).join('\n');

      toast.dismiss(toastId);

      // 4. Abrir WhatsApp directo al contacto con el mensaje
      if (telefono.length >= 10) {
        const waUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
        window.open(waUrl, '_blank');
        toast.success(`✅ PDF descargado. WhatsApp abierto con ${alumno.nombres}`);
      } else {
        toast.warning('PDF descargado. Número de teléfono no válido — abre WhatsApp manualmente.');
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Error al generar el cobro: ' + err.message, { id: toastId });
      }
    } finally {
      setLoadingBot(null);
    }
  };


  // 📈 CÁLCULOS FINANCIEROS (Basados en el rango de fechas seleccionado)

  const pagosFiltradosPorFecha = historialPagos.filter(p => {
    const pFecha = normalizeDate(p.fecha);
    return pFecha && pFecha >= fechaInicio && pFecha <= fechaFin;
  });
  
  const ingresosRecaudados = pagosFiltradosPorFecha
    .filter(p => p.metodo_pago !== 'Ajuste (Manual)') // Excluimos ajustes de la caja real
    .reduce((acc, pago) => acc + parseFloat(pago.total || 0), 0);
  
  const egresosFiltradosPorFecha = egresos.filter(e => 
    e.fecha && e.fecha >= fechaInicio && e.fecha <= fechaFin
  );
  const egresosTotales = egresosFiltradosPorFecha.reduce((acc, eg) => acc + parseFloat(eg.monto || 0), 0);
  
  const utilidadNeta = ingresosRecaudados - egresosTotales;
  
  // 👥 ESTADO DE JUGADORES (Solo mes actual para mora, pero lista filtrada por fechas para recibos)
  const idsPagadosEsteMes = new Set(pagosFiltradosPorFecha.map(p => p.jugador_id));

  const jugadoresFin = jugadores.map(j => {
    const currentPlanName = (j.tipo_plan || 'Regular').toLowerCase();
    const planBuscado = planes.find(p => p.nombre.toLowerCase() === currentPlanName);
    const esBeca100 = (planBuscado?.precio_base === 0) || currentPlanName.includes('100');

    // Notificación previa
    const cleanTel = String(j.telefono || '').replace(/\D/g, '');
    const yaNotificado = notificacionesMes.some(n => 
      String(n.destinatario_numero || '').replace(/\D/g, '').includes(cleanTel) && cleanTel.length > 5
    );

    // ── Pagos completos este período (EXCLUYE aportes de canchas/arbitraje)
    // Los aportes tienen concepto que empieza con 'Aporte:' y se gestionan en /director/aportes
    const pagadoEstePeriodo = pagosFiltradosPorFecha
      .filter(p => {
        // Excluir aportes para que NO afecten el estado de mensualidad
        const concepto = String(p.concepto || '').toLowerCase();
        if (concepto.startsWith('aporte:') || concepto.includes('aporte extra')) return false;
        // Excluir notas de aporte también
        const notas = String(p.notas || '').toLowerCase();
        if (notas.startsWith('aporte extra')) return false;
        // Coincidencia por ID (Prioritario)
        if (p.jugador_id === j.id) return true;
        // Fallback por nombre exacto si no hay ID
        if (!p.jugador_id) {
          const nameA = `${j.nombres} ${j.apellidos}`.toLowerCase().trim();
          const nameB = `${p.nombres} ${p.apellidos}`.toLowerCase().trim();
          return nameA === nameB;
        }
        return false;
      })
      .reduce((acc: number, p: any) => acc + parseFloat(p.total || 0), 0);

    // ── Abonos del mes de cobro seleccionado
    const periodoCobro = fechaInicio.substring(0, 7); // 'YYYY-MM'
    const abonosDelPeriodo = abonos
      .filter(a => a.perfil_id === j.id && String(a.periodo).startsWith(periodoCobro))
      .reduce((acc: number, a: any) => acc + parseFloat(a.monto || 0), 0);

    // ── Aportes Extras (Arbitraje, Canchas, etc.) 
    // Son pagos en el mes cuyo concepto NO es la mensualidad principal
    const aportesExtras = pagosFiltradosPorFecha
      .filter(p => p.jugador_id === j.id && !String(p.concepto || '').toLowerCase().includes('mensualidad'))
      .reduce((acc: number, p: any) => acc + parseFloat(p.total || 0), 0);

    // --- LÓGICA DE TARIFA INTELIGENTE ---
    const { tarifa: tarifaActual, precioBase } = calcularTarifaPeriodo(j.tipo_plan, fechaInicio);
    
    // Verificamos si algún pago se hizo en fecha de pronto pago (Día 1-5 usualmente)
    const limiteProntoPago = planBuscado?.dias_limite_pronto_pago || 5;
    const precioConDescuento = precioBase - (planBuscado?.descuento_pronto_pago || 0);

    const pagosEnPeriodo = pagosFiltradosPorFecha.filter(p => p.jugador_id === j.id);
    const algunaVezPagoPronto = pagosEnPeriodo.some(p => {
      if (!p.fecha) return false;
      // Manejar formatos YYYY-MM-DD o DD/MM/YYYY
      const partes = p.fecha.includes('-') ? p.fecha.split('-') : p.fecha.split('/');
      const diaStr = p.fecha.includes('-') ? partes[2] : partes[0];
      const diaPago = parseInt(diaStr);
      return !isNaN(diaPago) && diaPago <= limiteProntoPago;
    });

    // La tarifa objetivo es el descuento si pagó a tiempo, o la actual si no
    const tarifaObjetivo = algunaVezPagoPronto ? precioConDescuento : tarifaActual;

    const totalRecibidoPeriodo = pagadoEstePeriodo + abonosDelPeriodo;
    
    // Si el total recibido es >= a la tarifa (con margen de 100 por decimales), está al día
    // OJO: Si el pago coincide con el precio con descuento, también lo marcamos como AL DÍA (Lenience)
    const esAlDia = totalRecibidoPeriodo >= (tarifaObjetivo - 100) || 
                    totalRecibidoPeriodo >= (precioConDescuento - 100) ||
                    esBeca100;

    // Si está al día, el saldo pendiente es 0 (para que coincida con los totales de la plataforma)
    const saldoPendientePeriodo = esAlDia ? 0 : Math.max(0, (algunaVezPagoPronto ? precioConDescuento : tarifaActual) - totalRecibidoPeriodo);
    const tarifa = tarifaObjetivo;

    // ── Deuda acumulada de meses anteriores (meses donde no hay ningún pago ni abono)
    const hoyDate = new Date();
    const periodoDate = new Date(fechaInicio + 'T12:00:00');
    const mesesEnMora: string[] = [];
    let deudaAcumulada = 0;

    // Solo calcular mora histórica si no es beca 100%
    if (!esBeca100 && tarifa > 0) {
      // Límite = el MÁS RECIENTE entre: registro del club y registro del jugador.
      // Usamos 'fecha_ingreso_club' si existe (campo dedicado), si no, usamos created_at.
      // Esto evita que jugadores recién ingresados acumulen deuda de meses anteriores.
      const tenantCreatedAt = tenant?.created_at ? new Date(tenant.created_at) : null;
      
      // Preferir fecha_ingreso_club (campo explícito) sobre created_at (fecha de registro en sistema)
      const fechaIngresoRaw = j.fecha_ingreso_club || j.fecha_ingreso || j.created_at;
      const jugadorCreatedAt = fechaIngresoRaw ? new Date(fechaIngresoRaw) : null;

      const inicioClub   = tenantCreatedAt  ? new Date(tenantCreatedAt.getFullYear(),  tenantCreatedAt.getMonth(),  1) : new Date(hoyDate.getFullYear(), hoyDate.getMonth() - 6, 1);
      const inicioJugador = jugadorCreatedAt ? new Date(jugadorCreatedAt.getFullYear(), jugadorCreatedAt.getMonth(), 1) : inicioClub;

      // El límite real es el más reciente de los dos
      // Si el jugador se unió ESTE mes, primerMesValido = este mes → nunca acumula deuda histórica
      const primerMesValido = inicioJugador > inicioClub ? inicioJugador : inicioClub;

      for (let i = 1; i <= 6; i++) {
        const mesAnterior = new Date(periodoDate.getFullYear(), periodoDate.getMonth() - i, 1);
        const mesStr = mesAnterior.toISOString().substring(0, 7); // 'YYYY-MM'
        if (mesAnterior > hoyDate) break;         // No calcular meses futuros
        if (mesAnterior < primerMesValido) break; // No calcular antes del registro del club

        const pagosDelMes = historialPagos
          .filter(p => {
            if (!p.jugador_id || p.jugador_id !== j.id || !p.fecha) return false;
            const pFecha = normalizeDate(p.fecha);
            return pFecha.startsWith(mesStr);
          })
          .reduce((acc: number, p: any) => acc + parseFloat(p.total || 0), 0);

        const abonosMes = abonos
          .filter(a => a.perfil_id === j.id && String(a.periodo).startsWith(mesStr))
          .reduce((acc: number, a: any) => acc + parseFloat(a.monto || 0), 0);

        const totalMes = pagosDelMes + abonosMes;
        
        // --- LÓGICA DE REINICIO DE DEUDA ---
        // Si encontramos un registro que diga 'REINICIO DE DEUDA', dejamos de buscar hacia atrás
        const hayReinicio = historialPagos.some(p => {
          if (p.jugador_id !== j.id || !p.fecha) return false;
          const pFecha = normalizeDate(p.fecha);
          return pFecha.startsWith(mesStr) && String(p.notas || '').includes('REINICIO DE DEUDA');
        });

        if (hayReinicio) break;

        if (totalMes < tarifa) {
          const deudaMes = tarifa - totalMes;
          deudaAcumulada += deudaMes;
          const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
          mesesEnMora.push(`${meses[mesAnterior.getMonth()]} ${mesAnterior.getFullYear()}`);
        }
      }
    }


    const deudaTotal = saldoPendientePeriodo + deudaAcumulada;

    return { ...j, esAlDia, tarifa, esBeca100, saldoPendientePeriodo, deudaAcumulada, deudaTotal, mesesEnMora, abonosDelPeriodo, totalRecibidoPeriodo, aportesExtras, yaNotificado };
  });

  const totalJugadoresCobrales = jugadoresFin.filter(j => j.tarifa > 0).length;
  const totalAlDia = jugadoresFin.filter(j => j.esAlDia && j.tarifa > 0).length;
  const totalMora = totalJugadoresCobrales - totalAlDia;
  
  // --- NUEVA LÓGICA DE COBRANZA LIMPIA ---
  // Solo lo que está pendiente del periodo actual seleccionado
  const ingresosPendientesMes = jugadoresFin.reduce((acc, j) => acc + j.saldoPendientePeriodo, 0);
  
  // Lo que se debe de meses anteriores (Mora Histórica)
  const moraHistoricaTotal = jugadoresFin.reduce((acc, j) => acc + j.deudaAcumulada, 0);

  const totalProyectado = jugadoresFin.reduce((acc, j) => acc + j.tarifa, 0);
  const porcentajeRecaudo = totalProyectado > 0 ? Math.round((ingresosRecaudados / totalProyectado) * 100) : 0;

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
      const clubConfig = config || {};

      // 1. Limpiar número
      let cleanedNumber = String(reciboGenerado.telefono || '').replace(/\D/g, '');
      if (cleanedNumber.length === 10) cleanedNumber = `57${cleanedNumber}`;

      // 2. Generar PDF Profesional usando la librería central
      const pdfBase64 = await generarReciboPDFBase64({
        nombres: reciboGenerado.nombres,
        apellidos: reciboGenerado.apellidos,
        grupo: reciboGenerado.grupo,
        tarifa: reciboGenerado.total,
        consecutivo: reciboGenerado.consecutivo,
        fecha: reciboGenerado.fecha,
        metodo: reciboGenerado.metodo,
        empresa: {
          nombre_club: clubConfig.nombre_club,
          direccion: clubConfig.direccion || 'Sede Deportiva',
          ciudad: clubConfig.ciudad || 'Colombia',
          nequi: clubConfig.nequi,
          daviplata: clubConfig.daviplata,
          bre_b: clubConfig.bre_b,
          banco_nombre: clubConfig.banco_nombre,
          banco_numero: clubConfig.banco_numero
        }
      });
      const texto = `¡Hola! Confirmamos el recibo de tu pago № ${reciboGenerado.consecutivo.toString().padStart(4, '0')} por un valor de $${reciboGenerado.total.toLocaleString()}. Aquí tienes tu comprobante oficial en PDF.`;

      // 3. Envío vía API usando motor central
      const result = await enviarMensajeWhatsApp(
        reciboGenerado.telefono,
        texto,
        pdfBase64,
        'document',
        `Recibo_${reciboGenerado.nombres.replace(/\s/g, '_')}_${reciboGenerado.consecutivo}.pdf`,
        tenantSlug
      );

      if (!result.success) throw new Error(result.error);

      toast.success("Recibo enviado correctamente al alumno 🚀", { id: toastId });
      setReciboGenerado(null); // Cerramos tras éxito
    } catch (err: any) {
      toast.error("Error al enviar: " + err.message, { id: toastId });
    } finally {
      setLoadingBot(null);
    }
  };

  const forzarAlDia = async (jugador: any) => {
    if (!window.confirm(`¿Estás seguro de marcar a ${jugador.nombres} como Al día manualmente? Esto eliminará el saldo pendiente sin sumar dinero a los ingresos de caja.`)) return;
    
    const toastId = toast.loading("Aplicando ajuste manual...");
    try {
      const payload = {
        jugador_id: jugador.id,
        nombres: jugador.nombres,
        apellidos: jugador.apellidos,
        grupo: jugador.grupos || 'Sin grupo',
        monto_base: jugador.tarifa,
        total: jugador.tarifa,
        metodo_pago: 'Ajuste (Manual)',
        notas: 'CONCILIACIÓN MANUAL: Marcar como Al día sin ingreso de caja.',
        fecha: new Date().toISOString().split('T')[0],
        club_id: tenant?.id
      };

      const { error } = await supabase.from('pagos_ingresos').insert([payload]);
      if (error) throw error;

      toast.success(`${jugador.nombres} marcado como Al día correctamente`, { id: toastId });
      cargarDatos();
    } catch (err: any) {
      toast.error("Error: " + err.message, { id: toastId });
    }
  };

  // Aportes (canchas, arbitraje) → ahora gestionados en /director/aportes

  const generarYCompartirPDF = async () => {
    if (!reciboGenerado) return;
    const toastId = toast.loading("Preparando recibo...");
    try {
      const { data: config } = await supabase.from('configuracion_wa').select('*').single();
      
      const pdfBase64 = await generarReciboPDFBase64({
        nombres: reciboGenerado.nombres,
        apellidos: reciboGenerado.apellidos,
        grupo: reciboGenerado.grupo,
        tarifa: reciboGenerado.total,
        consecutivo: reciboGenerado.consecutivo,
        fecha: reciboGenerado.fecha,
        metodo: reciboGenerado.metodo,
        empresa: {
          nombre_club: config?.nombre_club,
          direccion: config?.direccion || 'Sede Deportiva',
          ciudad: config?.ciudad || 'Colombia',
          nequi: config?.nequi,
          daviplata: config?.daviplata,
          bre_b: config?.bre_b,
          banco_nombre: config?.banco_nombre,
          banco_numero: config?.banco_numero
        }
      });

      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
      
      const filename = `Recibo_${reciboGenerado.nombres.replace(/\s/g, '_')}.pdf`;
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        toast.dismiss(toastId);
        await navigator.share({ files: [file], title: 'Recibo de Pago' });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = filename;
        link.click();
        toast.success("Recibo descargado.", { id: toastId });
      }
    } catch (err: any) {
      toast.error("Error al procesar", { id: toastId });
    }
  };

  if (cargando && !tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-brand" />
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando Academia</p>
            <p className="text-[8px] text-slate-300 font-bold uppercase mt-1 tracking-tighter">Preparando Dashboard Multiclub</p>
          </div>
        </div>
      </div>
    );
  }

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
            <button onClick={() => router.push(route('/director/cobranza/planes'))} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-2">
              <Settings className="w-4 h-4" /> Gestión de Planes
            </button>
          </div>
        </div>

        {/* Banner de Asistente Inteligente */}
        {automatedTasks.length > 0 && isBannerVisible && (
          <div className="mb-6 bg-gradient-to-r from-brand/80 to-brand rounded-2xl p-1 shadow-lg shadow-brand/15 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-24 h-24 text-white" />
            </div>
            <div className="bg-white/95 backdrop-blur-sm rounded-[14px] p-5 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand/10 text-brand rounded-xl flex items-center justify-center animate-pulse">
                  <Bot className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    Asistente <span className="text-[10px] bg-brand text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Hoy</span>
                  </h3>
                  <p className="text-sm text-slate-500">He detectado <span className="font-bold text-brand">{automatedTasks.length} cobros programados</span> para hoy que no han sido notificados.</p>
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
                  className="flex-1 md:flex-none bg-brand hover:bg-brand/90 disabled:bg-slate-200 text-white px-6 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
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
              <div className="h-1 bg-brand/20 w-full overflow-hidden">
                <div 
                  className="h-full bg-brand transition-all duration-500 shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]" 
                  style={{ width: `${(batchProgress / automatedTasks.length) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-slate-900 tracking-tight">Periodo Contable</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mostrando recibos del rango seleccionado</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 w-full md:w-auto">
            <div className="flex flex-col px-3">
              <label className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Desde</label>
              <input 
                type="date" 
                value={fechaInicio} 
                onChange={(e) => setFechaInicio(e.target.value)} 
                className="bg-transparent text-xs font-bold outline-none text-slate-700" 
              />
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex flex-col px-3">
              <label className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Hasta</label>
              <input 
                type="date" 
                value={fechaFin} 
                onChange={(e) => setFechaFin(e.target.value)} 
                className="bg-transparent text-xs font-bold outline-none text-slate-700" 
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl mt-6 text-white shadow-xl border-l-4 border-brand relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldCheck className="w-16 h-16" /></div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-brand mb-0.5">Herramientas de Control</h4>
            <p className="text-[10px] text-slate-400 font-bold italic">Borrón y cuenta nueva para la deuda histórica</p>
          </div>
          <button 
            onClick={reiniciarDeudaGlobal}
            className="px-4 py-2 bg-brand hover:bg-brand/90 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg relative z-10"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reiniciar Deuda
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Proyectado</p>
            <h3 className="text-2xl font-black text-slate-800">${totalProyectado.toLocaleString('es-CO')}</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Estimado este mes</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingresos Reales</p>
            <h3 className="text-2xl font-black text-emerald-600">${ingresosRecaudados.toLocaleString('es-CO')}</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{porcentajeRecaudo}% del mes recaudado</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Por Cobrar (Mes)</p>
            <h3 className="text-2xl font-black text-amber-600">${ingresosPendientesMes.toLocaleString('es-CO')}</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Saldo del mes actual</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-rose-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mora Histórica</p>
            <h3 className="text-2xl font-black text-rose-600">${moraHistoricaTotal.toLocaleString('es-CO')}</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Deudas meses anteriores</p>
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
                      <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic">Cargando futbolistas...</td></tr>
                    ) : jugadoresFiltrados.length === 0 ? (
                      <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic">No se encontraron resultados.</td></tr>
                    ) : (
                      jugadoresFiltrados.map((jugador) => {
                        const esAlDia = jugador.esAlDia;
                        const yaNotificado = jugador.yaNotificado;
                        return (
                          <tr key={jugador.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-4 md:px-6">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-800 uppercase tracking-tight">{jugador.nombres} {jugador.apellidos}</p>
                                {yaNotificado && (
                                  <span className="bg-blue-50 text-blue-500 text-[9px] font-black px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1 uppercase tracking-tighter" title="Ya se le envió cobro/recibo este mes">
                                    <CheckCircle className="w-2.5 h-2.5" /> Notificado
                                  </span>
                                )}
                              </div>
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
                              {jugador.esBeca100 ? (
                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center w-fit gap-1.5 shadow-sm">
                                  <ShieldCheck className="w-3.5 h-3.5" /> Beca 100% / Al día
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider w-fit ${esAlDia ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                    {esAlDia ? 'Al día' : 'Pendiente'}
                                  </span>
                                  {/* Abono parcial registrado */}
                                  {jugador.abonosDelPeriodo > 0 && !esAlDia && (
                                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">
                                      Abonado: ${jugador.abonosDelPeriodo.toLocaleString('es-CO')} · Saldo: ${jugador.saldoPendientePeriodo.toLocaleString('es-CO')}
                                    </span>
                                  )}
                                  {/* Deuda de meses anteriores */}
                                  {jugador.deudaAcumulada > 0 && (
                                    <span className="text-[9px] font-black text-red-600 uppercase tracking-tighter flex items-center gap-1">
                                      🔴 Mora histórica: ${jugador.deudaAcumulada.toLocaleString('es-CO')} ({jugador.mesesEnMora.slice(0, 2).join(', ')})
                                    </span>
                                  )}
                                  {/* Deuda total si tiene mora + pendiente actual */}
                                  {jugador.deudaTotal > jugador.tarifa && (
                                    <span className="text-[10px] font-black text-red-800 uppercase tracking-tighter">
                                      ⚠️ Deuda total: ${jugador.deudaTotal.toLocaleString('es-CO')}
                                    </span>
                                  )}
                                  {(jugador.tipo_plan || '').toLowerCase().includes('50') && (
                                    <span className="text-[9px] font-black text-brand uppercase tracking-tighter">Beneficio Beca 50%</span>
                                  )}
                                </div>
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
                                      title="Enviar via Bot WhatsApp"
                                    >
                                      {loadingBot === jugador.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                                      {loadingBot === jugador.id ? 'Enviando...' : 'Bot'}
                                    </button>
                                    <button 
                                      onClick={() => cobrarManual(jugador)}
                                      disabled={loadingBot !== null}
                                      className="bg-brand hover:bg-brand/90 disabled:bg-slate-300 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 text-xs font-bold"
                                      title="Generar recibo y compartir manualmente por WhatsApp"
                                    >
                                      {loadingBot === `manual-${jugador.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                                      {loadingBot === `manual-${jugador.id}` ? 'Generando...' : 'Cobrar'}
                                    </button>
                                    <button onClick={() => abrirModalAbono(jugador)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5" title="Registrar abono parcial">
                                      <CreditCard className="w-3.5 h-3.5" /> Abonar
                                    </button>
                                    <button onClick={() => abrirModalPago(jugador)} className="bg-white border border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                                      Pagar
                                    </button>
                                    <button 
                                      onClick={() => forzarAlDia(jugador)} 
                                      className="text-slate-400 hover:text-slate-600 p-1.5 transition-colors"
                                      title="Marcar como Al día (Sin registro de caja)"
                                    >
                                      <ShieldCheck className="w-4 h-4" />
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
                                    className="text-[10px] font-bold bg-slate-50 border-none rounded px-1.5 py-0.5 text-brand focus:ring-0 cursor-pointer hover:bg-brand/10 transition-colors"
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
                    {pagosFiltradosPorFecha.length === 0 ? (
                      <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">No hay ingresos registrados en este rango de fechas.</td></tr>
                    ) : (
                      pagosFiltradosPorFecha.map((pago) => (
                        <tr key={pago.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 md:px-6 font-black text-slate-900">№ {pago.consecutivo.toString().padStart(3, '0')}</td>
                          <td className="p-4 md:px-6 font-bold text-slate-800 uppercase tracking-tight">{pago.nombres} {pago.apellidos}</td>
                          <td className="p-4 md:px-6 text-slate-600 font-medium">{pago.fecha ? pago.fecha.split('-').reverse().join('/') : '---'}</td>
                          <td className="p-4 md:px-6 uppercase font-bold text-[10px] text-slate-500">{pago.metodo_pago}</td>
                          <td className="p-4 md:px-6 text-right font-black text-emerald-600">${parseFloat(pago.total || "0").toLocaleString('es-CO')}</td>
                          <td className="p-4 md:px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={async () => { 
                                // Buscar el teléfono del alumno en su perfil (no está en el registro de pago)
                                const { data: perfil } = await supabase
                                  .from('perfiles')
                                  .select('telefono, grupos')
                                  .eq('id', pago.jugador_id)
                                  .single();
                                setReciboGenerado({ 
                                  ...pago, 
                                  montoBase: pago.monto_base, 
                                  metodo: pago.metodo_pago,
                                  telefono: perfil?.telefono || '',
                                  grupo: pago.grupo || perfil?.grupos || 'Sin grupo'
                                }); 
                              }} className="bg-white border border-slate-300 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2">
                                <Printer className="w-3.5 h-3.5" /> Reimprimir
                              </button>
                              <button onClick={() => abrirEditorPago(pago)} className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors" title="Editar pago">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => eliminarPagoHistorial(pago.id, pago.consecutivo)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors" title="Eliminar pago">
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
                            {egresosFiltradosPorFecha.length === 0 ? (
                                <tr><td colSpan={5} className="p-20 text-center text-slate-400 italic font-medium">No hay gastos registrados en este periodo.</td></tr>
                            ) : (
                                egresosFiltradosPorFecha.map(eg => (
                                    <tr key={eg.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 md:px-6 font-bold text-slate-800 uppercase">{eg.descripcion}</td>
                                        <td className="p-4 md:px-6">
                                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold uppercase">{eg.categoria}</span>
                                        </td>
                                        <td className="p-4 md:px-6 text-slate-50">{eg.fecha ? eg.fecha.split('-').reverse().join('/') : '---'}</td>
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

      {/* El div de impresión fue eliminado — ahora se usa el PDF premium directamente */}

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

              <button onClick={async () => {
                const { data: config } = await supabase.from('configuracion_wa').select('*').single();
                const pdfBase64 = await generarReciboPDFBase64({
                  nombres: reciboGenerado.nombres,
                  apellidos: reciboGenerado.apellidos,
                  grupo: reciboGenerado.grupo,
                  tarifa: reciboGenerado.total,
                  consecutivo: reciboGenerado.consecutivo,
                  fecha: reciboGenerado.fecha,
                  metodo: reciboGenerado.metodo,
                  empresa: {
                    nombre_club: config?.nombre_club,
                    direccion: config?.direccion || 'Sede Deportiva',
                    ciudad: config?.ciudad || 'Colombia',
                    nequi: config?.nequi,
                    daviplata: config?.daviplata,
                    bre_b: config?.bre_b,
                    banco_nombre: config?.banco_nombre,
                    banco_numero: config?.banco_numero
                  }
                });
                const byteArray = new Uint8Array(atob(pdfBase64).split('').map(c => c.charCodeAt(0)));
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const win = window.open(url, '_blank');
                win?.focus();
              }} className="w-full bg-slate-50 text-slate-500 font-bold py-3 rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2 hidden md:flex">
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
                <div className="flex items-center gap-2 mb-3 -[var(--brand-primary)]"><CreditCard className="w-5 h-5" /><p className="text-xs font-bold uppercase tracking-wider">Plan</p></div>
                <p className="text-sm font-bold text-slate-800">${(jugadorSeleccionado.tarifa || calcularTarifa(jugadorSeleccionado.tipo_plan)).toLocaleString('es-CO')}</p>
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
                 <p className="text-3xl font-black text-emerald-600">${((jugadorSeleccionado.tarifa || calcularTarifa(jugadorSeleccionado.tipo_plan)) - descuento + recargo).toLocaleString('es-CO')}</p>
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
      {/* MODAL DE ABONO PARCIAL */}
      {isModalAbonoOpen && jugadorAbono && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Abono Parcial</p>
                  <h2 className="text-xl font-black">{jugadorAbono.nombres} {jugadorAbono.apellidos}</h2>
                  <p className="text-sm opacity-80 mt-1">Tarifa: ${jugadorAbono.tarifa?.toLocaleString("es-CO")}{jugadorAbono.abonosDelPeriodo > 0 ? ` - Ya abonado: ${jugadorAbono.abonosDelPeriodo?.toLocaleString("es-CO")}` : ""}</p>
                  {jugadorAbono.deudaTotal > jugadorAbono.tarifa && (
                    <p className="text-xs font-black text-yellow-300 mt-1">Deuda total: ${jugadorAbono.deudaTotal?.toLocaleString("es-CO")} (meses anteriores)</p>
                  )}
                </div>
                <button onClick={() => setIsModalAbonoOpen(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto del Abono ($) *</label>
                <input type="number" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-lg text-slate-800" placeholder="0" autoFocus />
                {montoAbono && jugadorAbono.saldoPendientePeriodo > 0 && (
                  <p className="text-xs text-slate-500 mt-1">Saldo restante: <span className="font-black text-blue-600">${Math.max(0, jugadorAbono.saldoPendientePeriodo - Number(montoAbono)).toLocaleString("es-CO")}</span></p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Metodo de Pago</label>
                <select value={metodoPagoAbono} onChange={(e) => setMetodoPagoAbono(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white">
                  {["Efectivo", "Nequi", "Daviplata", "Transferencia", "Bre-B", "Otro"].map(m => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notas (opcional)</label>
                <input type="text" value={notasAbono} onChange={(e) => setNotasAbono(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Ej: Abono semana 1" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsModalAbonoOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
                <button onClick={registrarAbono} className="flex-1 px-4 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100">Registrar Abono</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL EDITAR PAGO */}
      {isModalEditarOpen && pagoEditando && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Editar Registro</p>
                  <h2 className="text-xl font-black">{pagoEditando.nombres} {pagoEditando.apellidos}</h2>
                  <p className="text-xs opacity-70 mt-1">{pagoEditando.notas?.startsWith("ABONO") ? "Abono parcial" : "Pago completo"}</p>
                </div>
                <button onClick={() => setIsModalEditarOpen(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto ($) *</label>
                <input type="number" value={editMonto} onChange={(e) => setEditMonto(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 font-black text-lg text-slate-800" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Metodo de Pago</label>
                <select value={editMetodo} onChange={(e) => setEditMetodo(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 font-bold bg-white">
                  {["Efectivo", "Nequi", "Daviplata", "Transferencia", "Bre-B", "Otro"].map(m => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha del Pago</label>
                <input type="date" value={editFecha} onChange={(e) => setEditFecha(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notas</label>
                <input type="text" value={editNotas} onChange={(e) => setEditNotas(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 font-medium" placeholder="Opcional" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsModalEditarOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                <button onClick={guardarEdicionPago} className="flex-1 px-4 py-3 rounded-xl font-black text-white bg-slate-800 hover:bg-slate-900 shadow-lg transition-all">Guardar Cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aportes (canchas, arbitraje, torneos) → módulo independiente en /director/aportes */}
    </div>
  );
}
