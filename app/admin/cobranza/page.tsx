'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Building2, CreditCard, DollarSign, Calendar, Search, 
  CheckCircle, FileText, Trash2, PlusCircle, X, 
  Loader2, Activity, Users, ArrowUpRight, TrendingUp, AlertTriangle,
  Smartphone, Bot, Settings, Check, Sparkles
} from 'lucide-react';
import { generarReciboSaaSPDFBase64, descargarReciboSaaSPDF } from '@/lib/recibo-saas-utils';

export default function SaasCobranzaPage() {
  const [cargando, setCargando] = useState(true);
  const [clubes, setClubes] = useState<any[]>([]);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [activosPorClub, setActivosPorClub] = useState<Record<string, number>>({});
  
  // Estado para envíos WhatsApp Bot y Manual
  const [loadingBot, setLoadingBot] = useState<string | null>(null);

  // Canales de pago SuperAdmin para cuentas de cobro
  const [canalesPago, setCanalesPago] = useState({
    banco_nombre: '',
    banco_numero: '',
    nequi: '',
    daviplata: '',
    bre_b: '',
    titular: '',
    nit_titular: '',
    instrucciones_adicionales: ''
  });
  const [isModalCanalesOpen, setIsModalCanalesOpen] = useState(false);
  const [guardandoCanales, setGuardandoCanales] = useState(false);
  
  // Filtros y Pestañas
  const [activeTab, setActiveTab] = useState<'estado_cuentas' | 'facturas' | 'pagos'>('estado_cuentas');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstadoFactura, setFiltroEstadoFactura] = useState('Todos');
  const [filtroMes, setFiltroMes] = useState('Todos');
  const [filtroAnio, setFiltroAnio] = useState('Todos');

  // Modal registrar pago
  const [isModalPagoOpen, setIsModalPagoOpen] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<any>(null);
  const [montoPagado, setMontoPagado] = useState('');
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  const [comprobanteUrl, setComprobanteUrl] = useState('');
  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().split('T')[0]);

  // Modal generar facturas
  const [isModalGenerarOpen, setIsModalGenerarOpen] = useState(false);
  const [mesGenerar, setMesGenerar] = useState(() => new Date().getMonth() + 1);
  const [anioGenerar, setAnioGenerar] = useState(() => new Date().getFullYear());

  // Edición de fecha de corte
  const [editingCorteId, setEditingCorteId] = useState<string | null>(null);
  const [editingCorteFecha, setEditingCorteFecha] = useState<string>('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // 1. Cargar clubes con sus planes
      const { data: clubesData } = await supabase
        .from('clubes')
        .select('*, planes_saas(id, nombre, precio_base, limite_jugadores_base, precio_jugador_extra)')
        .neq('estado', 'Eliminado')
        .order('nombre');
      
      // 2. Cargar todas las facturas con datos completos de club
      const { data: facturasData } = await supabase
        .from('facturacion_mensual')
        .select('*, clubes(id, nombre, slug, telefono_contacto, nombre_legal, proximo_corte)')
        .order('created_at', { ascending: false });

      // 3. Cargar todos los pagos (vía API para saltar RLS)
      const resPagos = await fetch('/api/admin/pagos-saas');
      if (resPagos.ok) {
        const resultPagos = await resPagos.json();
        if (resultPagos.data) setPagos(resultPagos.data);
      }

      // 4. Calcular atletas activos por club para el MRR (solo rol 'Futbolista' y 'Activo')
      let conteoMap: Record<string, number> = {};
      try {
        const resMetrics = await fetch('/api/admin/metrics');
        if (resMetrics.ok) {
          const metricsData = await resMetrics.json();
          if (metricsData.alumnosPorClub) {
            conteoMap = { ...metricsData.alumnosPorClub };
          }
        }
      } catch (errMetrics) {
        console.warn('Fallback a consulta directa perfiles:', errMetrics);
      }

      if (Object.keys(conteoMap).length === 0) {
        const { data: perfilesData } = await supabase
          .from('perfiles')
          .select('club_id')
          .eq('estado_miembro', 'Activo')
          .eq('rol', 'Futbolista');

        perfilesData?.forEach((p: any) => {
          if (p.club_id) {
            conteoMap[p.club_id] = (conteoMap[p.club_id] || 0) + 1;
          }
        });
      }

      // 5. Cargar canales de pago del SuperAdmin (Ajustes)
      let canales: any = null;
      try {
        const resConfig = await fetch('/api/admin/configuracion', { cache: 'no-store' });
        if (resConfig.ok) {
          const jsonConfig = await resConfig.json();
          canales = jsonConfig.data?.canales_pago;
        }
      } catch (_) {}

      if (!canales) {
        const { data: configAdmin } = await supabase
          .from('configuracion_superadmin')
          .select('*')
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle();

        canales = configAdmin?.canales_pago;
        if (!canales && configAdmin?.mensaje_cobro) {
          try {
            const parsed = JSON.parse(configAdmin.mensaje_cobro);
            if (parsed && typeof parsed === 'object') {
              canales = parsed.canales_pago || parsed;
            }
          } catch (_) {}
        }
      }

      if (canales && typeof canales === 'object') {
        setCanalesPago(prev => ({ ...prev, ...canales }));
      }

      if (clubesData) setClubes(clubesData);
      if (facturasData) setFacturas(facturasData);
      
      setActivosPorClub(conteoMap);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar la información de cobranza');
    } finally {
      setCargando(false);
    }
  };

  const ejecutarCorteSaaS = async () => {
    const confirmar = window.confirm('¿Confirmas que deseas calcular la facturación del mes para todos los clubes? Se creará la proyección mensual.');
    if (!confirmar) return;

    const toastId = toast.loading('Calculando facturación mensual...');
    try {
      const { data, error } = await supabase.functions.invoke('facturacion-mensual');
      if (error) throw error;
      
      toast.success('Corte mensual calculado con éxito', { id: toastId });
      cargarDatos();
    } catch (error: any) {
      toast.error('Error al calcular corte: ' + error.message, { id: toastId });
    }
  };

  const abrirModalPago = (factura: any) => {
    setFacturaSeleccionada(factura);
    setMontoPagado(String(factura.total_pagar));
    setMetodoPago('Transferencia');
    setComprobanteUrl('');
    setFechaPago(new Date().toISOString().split('T')[0]);
    setIsModalPagoOpen(true);
  };

  const confirmarPagoFactura = async () => {
    if (!facturaSeleccionada) return;

    const toastId = toast.loading('Registrando pago de suscripción...');
    try {
      // 1. & 2. Guardar en pagos_saas y marcar factura como pagada (vía API para evitar errores RLS)
      const resPago = await fetch('/api/admin/pagos-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          club_id: facturaSeleccionada.club_id,
          factura_id: facturaSeleccionada.id,
          monto_pagado: montoPagado,
          metodo_pago: metodoPago,
          fecha_pago: fechaPago,
          comprobante_url: comprobanteUrl
        })
      });
      const dataPago = await resPago.json();
      if (dataPago.error) throw new Error(dataPago.error);

      // 3. Extender suscripción del club (Llamando al API del sistema)
      const resSuscripcion = await fetch('/api/admin/suscripciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: facturaSeleccionada.club_id, meses: 1, es_prueba: false })
      });
      const dataSusc = await resSuscripcion.json();
      if (dataSusc.error) throw new Error(dataSusc.error);

      // 4. Trigger recibo (no bloquea si falla, pero avisa)
      if (dataPago.pago_id) {
        toast.loading('Membresía extendida. Enviando recibo por WhatsApp...', { id: toastId });
        try {
          const resRecibo = await fetch('/api/admin/enviar-recibo-saas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pago_id: dataPago.pago_id })
          });
          const resultRecibo = await resRecibo.json();
          if (resultRecibo.error) {
            toast.success('Membresía extendida, pero no se envió recibo: ' + resultRecibo.error, { id: toastId, duration: 5000 });
          } else {
            toast.success('Membresía extendida y recibo enviado 🚀', { id: toastId });
          }
        } catch (e: any) {
          toast.success('Membresía extendida (Error al enviar recibo)', { id: toastId });
        }
      } else {
        toast.success('Pago registrado y membresía de club extendida 🚀', { id: toastId });
      }

      setIsModalPagoOpen(false);
      cargarDatos();
    } catch (e: any) {
      toast.error('Error al registrar pago: ' + e.message, { id: toastId });
    }
  };

  const eliminarPago = async (pago: any) => {
    const confirmar = window.confirm(`¿Estás seguro de eliminar este pago por $${Number(pago.monto_pagado).toLocaleString('es-CO')}? Esto no revertirá la fecha de corte del club pero cambiará el estado de la factura.`);
    if (!confirmar) return;

    const toastId = toast.loading('Eliminando pago...');
    try {
      const res = await fetch(`/api/admin/pagos-saas?id=${pago.id}${pago.factura_id ? `&factura_id=${pago.factura_id}` : ''}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      toast.success('Pago eliminado', { id: toastId });
      cargarDatos();
    } catch (e: any) {
      toast.error('Error: ' + e.message, { id: toastId });
    }
  };

  const formatearTextoCanales = () => {
    return [
      canalesPago.banco_nombre && canalesPago.banco_numero ? `• ${canalesPago.banco_nombre}: *${canalesPago.banco_numero}*` : (canalesPago.banco_numero ? `• Cuenta Bancaria: *${canalesPago.banco_numero}*` : ''),
      canalesPago.nequi ? `• Nequi: *${canalesPago.nequi}*` : '',
      canalesPago.daviplata ? `• Daviplata: *${canalesPago.daviplata}*` : '',
      canalesPago.bre_b ? `• Llave Bre-B: *${canalesPago.bre_b}*` : '',
      canalesPago.titular ? `• Titular: *${canalesPago.titular}*` : '',
      canalesPago.nit_titular ? `• NIT / Doc: *${canalesPago.nit_titular}*` : '',
      canalesPago.instrucciones_adicionales ? `• Nota: ${canalesPago.instrucciones_adicionales}` : '',
    ].filter(Boolean).join('\n');
  };

  const guardarCanales = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoCanales(true);
    try {
      const res = await fetch('/api/admin/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canales_pago: canalesPago })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success('Canales de pago guardados exitosamente');
      setIsModalCanalesOpen(false);
    } catch (err: any) {
      toast.error('Error al guardar canales de pago: ' + err.message);
    } finally {
      setGuardandoCanales(false);
    }
  };

  // --- COBRANZA WHATSAPP: TAB 1 (ESTADO DE CUENTAS POR CLUB) ---
  const cobrarClubManual = async (club: any) => {
    const atletas = activosPorClub[club.id] || 0;
    const plan = club.planes_saas;
    const precioBase = plan ? Number(plan.precio_base ?? 100000) : 100000;
    const limiteBase = plan ? Number(plan.limite_jugadores_base ?? 60) : 60;
    const precioExtra = plan ? Number(plan.precio_jugador_extra ?? 2000) : 2000;
    const extras = Math.max(0, atletas - limiteBase);
    const mrrEstimado = precioBase + (extras * precioExtra);

    // Deuda activa si tiene facturas pendientes
    const facturasPendientes = facturas.filter(f => f.club_id === club.id && f.estado_pago !== 'pagado');
    const deuda = facturasPendientes.reduce((sum, f) => sum + Number(f.total_pagar), 0);
    const totalCobro = deuda > 0 ? deuda : mrrEstimado;

    const hoy = new Date();
    const mesNombre = nombreMes(hoy.getMonth() + 1);
    const anio = hoy.getFullYear();
    const fechaVenc = club.proximo_corte || `10/${hoy.getMonth() + 1}/${anio}`;
    const consecutivo = `COB-${anio}${String(hoy.getMonth() + 1).padStart(2, '0')}-${club.id.slice(0, 4).toUpperCase()}`;
    const filename = `Cuenta_Cobro_${mesNombre}_${anio}_${club.nombre.replace(/\s+/g, '_')}.pdf`;

    setLoadingBot(`manual-club-${club.id}`);
    const toastId = toast.loading(`Preparando cuenta de cobro para ${club.nombre}...`);

    try {
      const pdfBase64 = await generarReciboSaaSPDFBase64({
        clubNombre: club.nombre,
        clubDocumento: club.nombre_legal || 'N/A',
        clubTelefono: club.telefono_contacto,
        mesCobrado: `${mesNombre} ${anio}`,
        cantidadJugadores: atletas,
        montoTotal: totalCobro,
        consecutivo: consecutivo,
        fechaVencimiento: fechaVenc,
        estado: 'COBRO',
        canalesPago: formatearTextoCanales(),
        planNombre: club.planes_saas?.nombre || 'Plan SaaS'
      });

      // 1. Descargar PDF
      descargarReciboSaaSPDF(pdfBase64, filename);

      // 2. Formatear teléfono
      let telefono = String(club.telefono_contacto || '').replace(/\D/g, '');
      if (telefono.length === 10) telefono = `57${telefono}`;

      // 3. Texto del mensaje
      const mensaje = [
        `Hola directores de *${club.nombre}* 👋`,
        ``,
        `Les compartimos la *Cuenta de Cobro* correspondiente al periodo de *${mesNombre} ${anio}* por la suscripción a la plataforma tecnológica Master Club Manager.`,
        ``,
        `📋 *Detalle del Servicio:*`,
        `• Academia: *${club.nombre}*`,
        `• Atletas Activos: *${atletas}*`,
        `• Total a Pagar: *${formatearDinero(totalCobro)} COP*`,
        `• Fecha Límite / Corte: *${fechaVenc}*`,
        ``,
        `💳 *Canales de Pago Oficiales:*`,
        formatearTextoCanales() || '• Consultar canales oficiales de pago con soporte',
        ``,
        `Adjuntamos la cuenta de cobro en formato PDF con el desglose del servicio. Al realizar la consignación, por favor envíenos el soporte de pago por este medio.`,
        ``,
        `¡Gracias por confiar en *Master Club Manager*! ⚽🚀`
      ].join('\n');

      toast.dismiss(toastId);

      if (telefono.length >= 10) {
        const waUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
        window.open(waUrl, '_blank');
        toast.success(`✅ PDF descargado. WhatsApp abierto con ${club.nombre}`);
      } else {
        toast.warning(`PDF descargado. ${club.nombre} no tiene número de teléfono registrado.`);
      }
    } catch (err: any) {
      toast.error('Error al generar cobro: ' + err.message, { id: toastId });
    } finally {
      setLoadingBot(null);
    }
  };

  const cobrarClubBot = async (club: any) => {
    const atletas = activosPorClub[club.id] || 0;
    const plan = club.planes_saas;
    const precioBase = plan ? Number(plan.precio_base ?? 100000) : 100000;
    const limiteBase = plan ? Number(plan.limite_jugadores_base ?? 60) : 60;
    const precioExtra = plan ? Number(plan.precio_jugador_extra ?? 2000) : 2000;
    const extras = Math.max(0, atletas - limiteBase);
    const mrrEstimado = precioBase + (extras * precioExtra);

    const facturasPendientes = facturas.filter(f => f.club_id === club.id && f.estado_pago !== 'pagado');
    const deuda = facturasPendientes.reduce((sum, f) => sum + Number(f.total_pagar), 0);
    const totalCobro = deuda > 0 ? deuda : mrrEstimado;

    setLoadingBot(`bot-club-${club.id}`);
    const toastId = toast.loading(`Enviando cuenta de cobro por WhatsApp Bot a ${club.nombre}...`);
    try {
      const res = await fetch('/api/admin/enviar-recibo-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          club_id: club.id,
          atletas,
          monto: totalCobro,
          fecha_vencimiento: club.proximo_corte
        })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success(`Cuenta de cobro enviada a ${club.nombre} vía Bot 🚀`, { id: toastId });
    } catch (err: any) {
      toast.error('Error: ' + err.message, { id: toastId });
    } finally {
      setLoadingBot(null);
    }
  };

  // --- COBRANZA WHATSAPP: TAB 2 (FACTURAS EMITIDAS) ---
  const cobrarFacturaManual = async (fac: any) => {
    const club = fac.clubes || clubes.find(c => c.id === fac.club_id);
    const mesNombre = nombreMes(fac.periodo_mes);
    const anio = fac.periodo_anio;
    const esPagado = fac.estado_pago === 'pagado';
    const fechaVenc = fac.fecha_vencimiento || club?.proximo_corte || `10/${fac.periodo_mes}/${anio}`;
    const consecutivo = `FAC-${anio}${String(fac.periodo_mes).padStart(2, '0')}-${fac.id.slice(0, 4).toUpperCase()}`;
    const filename = `${esPagado ? 'Recibo_Pago' : 'Cuenta_Cobro'}_${mesNombre}_${anio}_${(club?.nombre || 'Club').replace(/\s+/g, '_')}.pdf`;

    setLoadingBot(`manual-fac-${fac.id}`);
    const toastId = toast.loading(`Preparando documento para ${club?.nombre || 'el club'}...`);

    try {
      const pdfBase64 = await generarReciboSaaSPDFBase64({
        clubNombre: club?.nombre || 'Club Deportivo',
        clubDocumento: club?.nombre_legal || 'N/A',
        clubTelefono: club?.telefono_contacto,
        mesCobrado: `${mesNombre} ${anio}`,
        cantidadJugadores: fac.cantidad_jugadores || 0,
        montoTotal: Number(fac.total_pagar),
        consecutivo: consecutivo,
        fechaPago: esPagado ? new Date().toISOString().split('T')[0] : undefined,
        fechaVencimiento: fechaVenc,
        estado: esPagado ? 'PAGADO' : 'COBRO',
        canalesPago: formatearTextoCanales()
      });

      descargarReciboSaaSPDF(pdfBase64, filename);

      let telefono = String(club?.telefono_contacto || '').replace(/\D/g, '');
      if (telefono.length === 10) telefono = `57${telefono}`;

      let mensaje = '';
      if (esPagado) {
        mensaje = [
          `¡Hola directores de *${club?.nombre || 'Club'}*! 👋`,
          ``,
          `Les compartimos el comprobante de su factura de suscripción a Master Club Manager correspondiente a *${mesNombre} ${anio}* por valor de *${formatearDinero(fac.total_pagar)} COP*, registrada como *PAGADA*.`,
          ``,
          `¡Gracias por su puntualidad y confianza en nuestra plataforma! ⚽✨`
        ].join('\n');
      } else {
        mensaje = [
          `Hola directores de *${club?.nombre || 'Club'}* 👋`,
          ``,
          `Les compartimos la *Cuenta de Cobro* correspondiente al periodo de *${mesNombre} ${anio}* por la suscripción a Master Club Manager.`,
          ``,
          `📋 *Detalle:*`,
          `• Academia: *${club?.nombre}*`,
          `• Atletas: *${fac.cantidad_jugadores || 0}*`,
          `• Total a Pagar: *${formatearDinero(fac.total_pagar)} COP*`,
          `• Vence: *${fechaVenc}*`,
          ``,
          `💳 *Canales de Pago:*`,
          formatearTextoCanales() || '• Consultar canales oficiales de pago con soporte',
          ``,
          `Adjuntamos el PDF de cobro. Al consignar por favor envíenos el comprobante. ¡Gracias! ⚽🚀`
        ].join('\n');
      }

      toast.dismiss(toastId);

      if (telefono.length >= 10) {
        const waUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
        window.open(waUrl, '_blank');
        toast.success(`✅ PDF descargado. WhatsApp abierto con ${club?.nombre || 'el club'}`);
      } else {
        toast.warning('PDF descargado. Teléfono no registrado para abrir WhatsApp.');
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message, { id: toastId });
    } finally {
      setLoadingBot(null);
    }
  };

  const cobrarFacturaBot = async (fac: any) => {
    setLoadingBot(`bot-fac-${fac.id}`);
    const toastId = toast.loading('Enviando documento por WhatsApp Bot...');
    try {
      const res = await fetch('/api/admin/enviar-recibo-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factura_id: fac.id })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success('Documento enviado vía WhatsApp Bot 🚀', { id: toastId });
    } catch (err: any) {
      toast.error('Error al enviar: ' + err.message, { id: toastId });
    } finally {
      setLoadingBot(null);
    }
  };

  // --- COBRANZA WHATSAPP: TAB 3 (HISTORIAL DE PAGOS) ---
  const enviarReciboPagoManual = async (p: any) => {
    const club = p.clubes || clubes.find(c => c.id === p.club_id);
    const hoy = new Date(p.fecha_pago || Date.now());
    const mesNombre = nombreMes(hoy.getMonth() + 1);
    const anio = hoy.getFullYear();
    const consecutivo = `REC-${p.id.slice(0, 6).toUpperCase()}`;
    const filename = `Recibo_Pago_${mesNombre}_${anio}_${(club?.nombre || 'Club').replace(/\s+/g, '_')}.pdf`;

    setLoadingBot(`manual-pago-${p.id}`);
    const toastId = toast.loading(`Generando recibo de pago para ${club?.nombre || 'el club'}...`);

    try {
      const pdfBase64 = await generarReciboSaaSPDFBase64({
        clubNombre: club?.nombre || 'Club Deportivo',
        clubDocumento: club?.nombre_legal || 'N/A',
        clubTelefono: club?.telefono_contacto,
        mesCobrado: `${mesNombre} ${anio}`,
        cantidadJugadores: activosPorClub[p.club_id] || 0,
        montoTotal: Number(p.monto_pagado),
        consecutivo: consecutivo,
        metodoPago: p.metodo_pago || 'Transferencia',
        fechaPago: p.fecha_pago,
        estado: 'PAGADO'
      });

      descargarReciboSaaSPDF(pdfBase64, filename);

      let telefono = String(club?.telefono_contacto || '').replace(/\D/g, '');
      if (telefono.length === 10) telefono = `57${telefono}`;

      const mensaje = [
        `¡Hola directores de *${club?.nombre || 'Club'}*! 👋`,
        ``,
        `Hemos recibido y confirmado exitosamente su pago de suscripción a Master Club Manager por un valor de *${formatearDinero(p.monto_pagado)} COP* correspondiente a *${mesNombre} ${anio}*.`,
        ``,
        `Adjuntamos su *Recibo Oficial de Pago*. Su membresía y servicios continúan activos al 100%.`,
        ``,
        `¡Gracias por seguir creciendo junto a nosotros! ⚽✨`
      ].join('\n');

      toast.dismiss(toastId);

      if (telefono.length >= 10) {
        const waUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
        window.open(waUrl, '_blank');
        toast.success(`✅ Recibo descargado. WhatsApp abierto con ${club?.nombre || 'el club'}`);
      } else {
        toast.warning('Recibo descargado. Teléfono no registrado para abrir WhatsApp.');
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message, { id: toastId });
    } finally {
      setLoadingBot(null);
    }
  };

  const enviarReciboPagoBot = async (p: any) => {
    setLoadingBot(`bot-pago-${p.id}`);
    const toastId = toast.loading('Enviando recibo oficial por WhatsApp Bot...');
    try {
      const res = await fetch('/api/admin/enviar-recibo-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pago_id: p.id })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success('Recibo de pago enviado exitosamente vía Bot 🚀', { id: toastId });
    } catch (err: any) {
      toast.error('Error al enviar recibo: ' + err.message, { id: toastId });
    } finally {
      setLoadingBot(null);
    }
  };

  const iniciarEdicionCorte = (club: any) => {
    setEditingCorteId(club.id);
    setEditingCorteFecha(club.proximo_corte || new Date().toISOString().split('T')[0]);
  };

  const cancelarEdicionCorte = () => {
    setEditingCorteId(null);
    setEditingCorteFecha('');
  };

  const guardarCorte = async (club: any) => {
    if (!editingCorteFecha) return;
    
    // Validar formato YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editingCorteFecha)) {
      toast.error('Formato inválido. Usa YYYY-MM-DD.');
      return;
    }

    const toastId = toast.loading('Actualizando fecha de corte...');
    try {
      const res = await fetch(`/api/admin/clubes/${club.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proximo_corte: editingCorteFecha })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success('Fecha de corte actualizada', { id: toastId });
      setEditingCorteId(null);
      cargarDatos();
    } catch (e: any) {
      toast.error('Error al actualizar: ' + e.message, { id: toastId });
    }
  };

  const generarFacturasManuales = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading(`Generando facturas para el periodo ${mesGenerar}/${anioGenerar}...`);
    try {
      const res = await fetch('/api/admin/cobranza/facturacion-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesGenerar, anioGenerar })
      });
      const result = await res.json();
      
      if (result.error) throw new Error(result.error);

      toast.success(`Proceso completado. Facturas creadas: ${result.insertadas}. Ya existentes: ${result.duplicadas}`, { id: toastId });
      setIsModalGenerarOpen(false);
      cargarDatos();
    } catch (err: any) {
      toast.error('Error al generar: ' + err.message, { id: toastId });
    }
  };

  const formatearDinero = (monto: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(monto);
  };

  const nombreMes = (m: number) => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[m - 1] || '';
  };

  // --- CÁLCULO DE MÉTRICAS GLOBALES ---
  const mrrTotal = clubes.reduce((sum, club) => {
    const totalAtletas = activosPorClub[club.id] || 0;
    const plan = club.planes_saas;
    const precioBase = plan ? Number(plan.precio_base ?? 100000) : 100000;
    const limiteBase = plan ? Number(plan.limite_jugadores_base ?? 60) : 60;
    const precioExtra = plan ? Number(plan.precio_jugador_extra ?? 2000) : 2000;
    
    const extras = Math.max(0, totalAtletas - limiteBase);
    return sum + precioBase + (extras * precioExtra);
  }, 0);

  const facturadoMes = facturas
    .filter(f => f.periodo_mes === new Date().getMonth() + 1 && f.periodo_anio === new Date().getFullYear())
    .reduce((sum, f) => sum + Number(f.total_pagar), 0);

  const cobradoMes = facturas
    .filter(f => f.periodo_mes === new Date().getMonth() + 1 && f.periodo_anio === new Date().getFullYear() && f.estado_pago === 'pagado')
    .reduce((sum, f) => sum + Number(f.total_pagar), 0);

  const deudasTotales = facturas
    .filter(f => f.estado_pago !== 'pagado')
    .reduce((sum, f) => sum + Number(f.total_pagar), 0);

  // --- FILTROS DE LISTAS ---
  const clubesFiltrados = clubes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    c.slug.toLowerCase().includes(busqueda.toLowerCase())
  );

  const facturasFiltradas = facturas.filter(f => {
    const matchesSearch = f.clubes?.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    const matchesEstado = filtroEstadoFactura === 'Todos' || f.estado_pago === filtroEstadoFactura.toLowerCase();
    const matchesMes = filtroMes === 'Todos' || f.periodo_mes === Number(filtroMes);
    const matchesAnio = filtroAnio === 'Todos' || f.periodo_anio === Number(filtroAnio);
    return matchesSearch && matchesEstado && matchesMes && matchesAnio;
  });

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-lime-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cobranza Multiclub</h1>
          <p className="text-slate-500 font-medium mt-1">Controla los pagos de membresías SaaS, emite cobros e ingresa abonos de los clubes.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setIsModalCanalesOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-4 py-3 rounded-2xl text-sm transition-all flex items-center gap-2 shadow-sm"
            title="Configurar cuentas bancarias de Master Club Manager que aparecerán en los cobros"
          >
            <CreditCard size={18} className="text-lime-600" /> Canales de Pago MCM
          </button>
          <button 
            onClick={() => setIsModalGenerarOpen(true)}
            className="bg-slate-950 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-2xl text-sm transition-all flex items-center gap-2"
          >
            <PlusCircle size={18} /> Crear Factura Manual
          </button>
          <button 
            onClick={ejecutarCorteSaaS}
            className="bg-lime-500 hover:bg-lime-600 text-white font-bold px-5 py-3 rounded-2xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-lime-200"
          >
            <Activity size={18} /> Generar Corte Automático
          </button>
        </div>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">MRR Total Estimado</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500"><TrendingUp size={16}/></div>
          </div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">{formatearDinero(mrrTotal)}</h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">Proyección base mensual</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cobrado (Este Mes)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500"><CheckCircle size={16}/></div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 tracking-tight">{formatearDinero(cobradoMes)}</h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">De {formatearDinero(facturadoMes)} facturados</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Deuda Total Pendiente</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-500"><AlertTriangle size={16}/></div>
          </div>
          <h3 className="text-2xl font-black text-red-600 tracking-tight">{formatearDinero(deudasTotales)}</h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">De todos los meses</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Academias</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500"><Building2 size={16}/></div>
          </div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">{clubes.length} Clubes</h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">Activos en la plataforma</p>
        </div>
      </div>

      {/* PESTAÑAS DE CONTROL */}
      <div className="flex gap-6 border-b border-slate-200">
        <button 
          onClick={() => { setActiveTab('estado_cuentas'); setBusqueda(''); }}
          className={`pb-4 px-2 font-bold text-sm transition-all border-b-2 ${activeTab === 'estado_cuentas' ? 'border-lime-500 text-lime-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Estado de Cuentas por Club
        </button>
        <button 
          onClick={() => { setActiveTab('facturas'); setBusqueda(''); }}
          className={`pb-4 px-2 font-bold text-sm transition-all border-b-2 ${activeTab === 'facturas' ? 'border-lime-500 text-lime-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Facturas Emitidas ({facturas.length})
        </button>
        <button 
          onClick={() => { setActiveTab('pagos'); setBusqueda(''); }}
          className={`pb-4 px-2 font-bold text-sm transition-all border-b-2 ${activeTab === 'pagos' ? 'border-lime-500 text-lime-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Historial de Pagos ({pagos.length})
        </button>
      </div>

      {/* CONTROLES / FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
            placeholder="Buscar por academia o slug..." 
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime-500/35 focus:bg-white transition-all text-brand font-medium"
          />
        </div>

        {activeTab === 'facturas' && (
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={filtroEstadoFactura} 
              onChange={e => setFiltroEstadoFactura(e.target.value)} 
              className="bg-slate-50 border border-slate-200 text-xs font-bold uppercase rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-lime-500 text-slate-600"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Pagado">Pagado</option>
            </select>

            <select 
              value={filtroMes} 
              onChange={e => setFiltroMes(e.target.value)} 
              className="bg-slate-50 border border-slate-200 text-xs font-bold uppercase rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-lime-500 text-slate-600"
            >
              <option value="Todos">Todos los Meses</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{nombreMes(m)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* CONTENIDO DE PESTAÑA: ESTADO DE CUENTAS */}
      {activeTab === 'estado_cuentas' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Academia / Club</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Atletas Activos</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Plan / Suscripción</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Membresía</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Próximo Corte</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Deuda Activa</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Cobro WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clubesFiltrados.map(club => {
                  const atletas = activosPorClub[club.id] || 0;
                  const plan = club.planes_saas;
                  const precioBase = plan ? Number(plan.precio_base ?? 100000) : 100000;
                  const limiteBase = plan ? Number(plan.limite_jugadores_base ?? 60) : 60;
                  const precioExtra = plan ? Number(plan.precio_jugador_extra ?? 2000) : 2000;
                  
                  const extras = Math.max(0, atletas - limiteBase);
                  const mrrEstimado = precioBase + (extras * precioExtra);
                  
                  // Calcular deuda pendiente
                  const deuda = facturas
                    .filter(f => f.club_id === club.id && f.estado_pago !== 'pagado')
                    .reduce((sum, f) => sum + Number(f.total_pagar), 0);

                  const isVencido = club.proximo_corte ? new Date(club.proximo_corte) < new Date() : true;

                  return (
                    <tr key={club.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{club.nombre}</div>
                        <div className="text-xs text-lime-600 mt-1 font-mono">/{club.slug}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-lg font-black text-slate-800">{atletas}</div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">futbolistas</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-sm">{plan?.nombre || 'Plan Estándar'}</div>
                        <div className="text-xs text-slate-500 mt-1">Est. {formatearDinero(mrrEstimado)}/mes</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          club.estado === 'Activo' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {club.estado_suscripcion || club.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {editingCorteId === club.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={editingCorteFecha}
                              onChange={(e) => setEditingCorteFecha(e.target.value)}
                              className="text-xs font-bold px-2 py-1 rounded-md border border-slate-300 outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
                            />
                            <button 
                              onClick={() => guardarCorte(club)}
                              className="p-1.5 text-white bg-lime-500 hover:bg-lime-600 rounded-md transition-colors"
                              title="Guardar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                            <button 
                              onClick={cancelarEdicionCorte}
                              className="p-1.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                              title="Cancelar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md border ${
                              isVencido ? 'bg-red-50 text-red-600 border-red-100' : 'bg-lime-50 text-lime-700 border-lime-100'
                            }`}>
                              {club.proximo_corte || 'No Definido'}
                            </span>
                            <button 
                              onClick={() => iniciarEdicionCorte(club)}
                              className="p-1.5 text-slate-400 hover:text-lime-600 hover:bg-slate-100 rounded-md transition-colors"
                              title="Asignar fecha de corte manual"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {deuda > 0 ? (
                          <div>
                            <div className="font-black text-red-600 text-base">{formatearDinero(deuda)}</div>
                            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Cobros Pendientes</span>
                          </div>
                        ) : (
                          <div className="text-emerald-600 font-bold text-sm">Al día ✅</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => cobrarClubBot(club)}
                            disabled={loadingBot !== null}
                            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold"
                            title="Enviar Cuenta de Cobro por WhatsApp Bot (Automático)"
                          >
                            {loadingBot === `bot-club-${club.id}` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Bot className="w-3.5 h-3.5" />
                            )}
                            <span>Bot</span>
                          </button>
                          <button
                            onClick={() => cobrarClubManual(club)}
                            disabled={loadingBot !== null}
                            className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold"
                            title="Descargar PDF de Cuenta de Cobro y abrir WhatsApp al contacto del club"
                          >
                            {loadingBot === `manual-club-${club.id}` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Smartphone className="w-3.5 h-3.5" />
                            )}
                            <span>Manual</span>
                          </button>
                        </div>
                        {!club.telefono_contacto && (
                          <span className="text-[10px] text-amber-600 font-semibold block mt-1">Sin teléfono</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: FACTURAS EMITIDAS */}
      {activeTab === 'facturas' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Periodo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Academia / Club</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Atletas Facturados</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Monto Factura</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Estado</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facturasFiltradas.map(fac => (
                  <tr key={fac.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-600">
                      {nombreMes(fac.periodo_mes)} {fac.periodo_anio}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {fac.clubes?.nombre}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-600">
                      {fac.cantidad_jugadores}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">
                      {formatearDinero(fac.total_pagar)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg border ${
                        fac.estado_pago === 'pagado' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                        {fac.estado_pago}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {fac.estado_pago !== 'pagado' ? (
                          <>
                            <button 
                              onClick={() => abrirModalPago(fac)}
                              className="bg-lime-500 hover:bg-lime-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all shadow-sm"
                              title="Registrar pago manual"
                            >
                              Pagar
                            </button>
                            <button
                              onClick={() => cobrarFacturaBot(fac)}
                              disabled={loadingBot !== null}
                              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white p-1.5 rounded-xl transition-all shadow-sm flex items-center text-xs font-bold"
                              title="Enviar cobro por WhatsApp Bot (Automático)"
                            >
                              {loadingBot === `bot-fac-${fac.id}` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Bot className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => cobrarFacturaManual(fac)}
                              disabled={loadingBot !== null}
                              className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white p-1.5 rounded-xl transition-all shadow-sm flex items-center text-xs font-bold"
                              title="Descargar PDF de Cuenta de Cobro y abrir WhatsApp"
                            >
                              {loadingBot === `manual-fac-${fac.id}` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Smartphone className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">Pagada</span>
                            <button
                              onClick={() => cobrarFacturaBot(fac)}
                              disabled={loadingBot !== null}
                              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white p-1.5 rounded-xl transition-all shadow-sm flex items-center text-xs font-bold"
                              title="Reenviar comprobante oficial por WhatsApp Bot"
                            >
                              {loadingBot === `bot-fac-${fac.id}` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Bot className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => cobrarFacturaManual(fac)}
                              disabled={loadingBot !== null}
                              className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white p-1.5 rounded-xl transition-all shadow-sm flex items-center text-xs font-bold"
                              title="Descargar recibo y abrir WhatsApp"
                            >
                              {loadingBot === `manual-fac-${fac.id}` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Smartphone className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {facturasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">No se encontraron facturas con los filtros aplicados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: HISTORIAL DE PAGOS */}
      {activeTab === 'pagos' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha Pago</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Academia / Club</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Método</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Monto Pagado</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Comprobante</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagos.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      {new Date(p.fecha_pago).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {p.clubes?.nombre}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">
                      {p.metodo_pago}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">
                      {formatearDinero(p.monto_pagado)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {p.comprobante_url ? (
                        <a 
                          href={p.comprobante_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 justify-center"
                        >
                          Ver Adjunto <ArrowUpRight size={12}/>
                        </a>
                      ) : (
                        <a 
                          href={`/api/admin/descargar-recibo-saas?pago_id=${p.id}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-lime-600 hover:underline flex items-center gap-1 justify-center"
                          title="Descargar PDF Generado por el Sistema"
                        >
                          Ver PDF <ArrowUpRight size={12}/>
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => enviarReciboPagoBot(p)}
                          disabled={loadingBot !== null}
                          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white px-2.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1 text-xs font-bold"
                          title="Enviar recibo de pago por WhatsApp Bot (Automático)"
                        >
                          {loadingBot === `bot-pago-${p.id}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Bot className="w-3.5 h-3.5" />
                          )}
                          <span>Bot</span>
                        </button>
                        <button
                          onClick={() => enviarReciboPagoManual(p)}
                          disabled={loadingBot !== null}
                          className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white px-2.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1 text-xs font-bold"
                          title="Descargar recibo oficial y abrir WhatsApp al contacto"
                        >
                          {loadingBot === `manual-pago-${p.id}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Smartphone className="w-3.5 h-3.5" />
                          )}
                          <span>Manual</span>
                        </button>
                        <button 
                          onClick={() => eliminarPago(p)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-colors"
                          title="Eliminar registro de pago"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pagos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">Aún no hay ningún pago registrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR PAGO */}
      {isModalPagoOpen && facturaSeleccionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900">Registrar Pago de Suscripción</h3>
              <button onClick={() => setIsModalPagoOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-xl transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 bg-slate-50 border-b border-slate-100 text-center">
              <p className="text-sm text-slate-500 font-medium">Factura del periodo</p>
              <p className="text-xl font-black text-slate-800 mt-1">{nombreMes(facturaSeleccionada.periodo_mes)} {facturaSeleccionada.periodo_anio}</p>
              <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Academia: {facturaSeleccionada.clubes?.nombre}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Monto Pagado (COP)</label>
                <input 
                  type="number" 
                  value={montoPagado} 
                  onChange={e => setMontoPagado(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all font-black text-emerald-600"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Método de Pago</label>
                  <select 
                    value={metodoPago} 
                    onChange={e => setMetodoPago(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold text-slate-700"
                  >
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Nequi">Nequi</option>
                    <option value="Daviplata">Daviplata</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="MercadoPago">MercadoPago</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Fecha de Pago</label>
                  <input 
                    type="date" 
                    value={fechaPago} 
                    onChange={e => setFechaPago(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Enlace del Comprobante (URL)</label>
                <input 
                  type="url" 
                  value={comprobanteUrl} 
                  onChange={e => setComprobanteUrl(e.target.value)} 
                  placeholder="https://drive.google.com/file/d/..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all text-slate-700"
                />
              </div>

              <div className="pt-4">
                <button 
                  onClick={confirmarPagoFactura}
                  className="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm"
                >
                  Registrar Pago y Activar Club
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GENERAR FACTURAS MANUALES */}
      {isModalGenerarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900">Facturación Manual</h3>
              <button onClick={() => setIsModalGenerarOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-xl transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={generarFacturasManuales} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Genera las deudas de cobro de suscripción para todos los clubes en el periodo seleccionado de forma manual. Si un club ya cuenta con factura para este periodo, se omitirá.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Mes</label>
                  <select 
                    value={mesGenerar} 
                    onChange={e => setMesGenerar(Number(e.target.value))} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold text-slate-700"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{nombreMes(m)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Año</label>
                  <input 
                    type="number" 
                    value={anioGenerar} 
                    onChange={e => setAnioGenerar(Number(e.target.value))} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm"
                >
                  Emitir Facturación Mensual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAR CANALES DE PAGO MCM */}
      {isModalCanalesOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-lime-100 flex items-center justify-center text-lime-700">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Canales de Pago MCM</h3>
                  <p className="text-xs text-slate-500 font-medium">Cuentas visibles en cobros y WhatsApp</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalCanalesOpen(false)} 
                className="text-slate-400 hover:bg-slate-100 p-2 rounded-xl transition-colors"
              >
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={guardarCanales} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-medium bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800">
                💡 Estas cuentas bancarias aparecerán automáticamente en el PDF oficial de <strong>Cuenta de Cobro</strong> y en el mensaje de WhatsApp enviado a los directores de los clubes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Banco / Tipo de Cuenta</label>
                  <input 
                    type="text" 
                    value={canalesPago.banco_nombre} 
                    onChange={e => setCanalesPago({ ...canalesPago, banco_nombre: e.target.value })} 
                    placeholder="Ej. Bancolombia Ahorros" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Número de Cuenta</label>
                  <input 
                    type="text" 
                    value={canalesPago.banco_numero} 
                    onChange={e => setCanalesPago({ ...canalesPago, banco_numero: e.target.value })} 
                    placeholder="Ej. 123-456789-00" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nequi</label>
                  <input 
                    type="text" 
                    value={canalesPago.nequi} 
                    onChange={e => setCanalesPago({ ...canalesPago, nequi: e.target.value })} 
                    placeholder="Ej. 3001234567" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Daviplata</label>
                  <input 
                    type="text" 
                    value={canalesPago.daviplata} 
                    onChange={e => setCanalesPago({ ...canalesPago, daviplata: e.target.value })} 
                    placeholder="Ej. 3001234567" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Llave Bre-B</label>
                  <input 
                    type="text" 
                    value={canalesPago.bre_b} 
                    onChange={e => setCanalesPago({ ...canalesPago, bre_b: e.target.value })} 
                    placeholder="Ej. 3001234567" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Titular de la Cuenta / Razón Social</label>
                  <input 
                    type="text" 
                    value={canalesPago.titular} 
                    onChange={e => setCanalesPago({ ...canalesPago, titular: e.target.value })} 
                    placeholder="Ej. Master Club Manager" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">NIT / Cédula del Titular</label>
                  <input 
                    type="text" 
                    value={canalesPago.nit_titular} 
                    onChange={e => setCanalesPago({ ...canalesPago, nit_titular: e.target.value })} 
                    placeholder="Ej. 901234567-8" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Instrucciones Adicionales / Notas</label>
                <input 
                  type="text" 
                  value={canalesPago.instrucciones_adicionales} 
                  onChange={e => setCanalesPago({ ...canalesPago, instrucciones_adicionales: e.target.value })} 
                  placeholder="Ej. Enviar comprobante al WhatsApp oficial" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-lime-500 outline-none transition-all font-bold text-slate-800"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalCanalesOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={guardandoCanales}
                  className="flex-1 bg-lime-500 hover:bg-lime-600 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
                >
                  {guardandoCanales ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {guardandoCanales ? 'Guardando...' : 'Guardar Canales'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
