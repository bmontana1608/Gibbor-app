'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Building2, CreditCard, DollarSign, Calendar, Search, 
  CheckCircle, FileText, Trash2, PlusCircle, X, 
  Loader2, Activity, Users, ArrowUpRight, TrendingUp, AlertTriangle,
  MessageSquare, Send, Smartphone, Bell, Printer, RefreshCw, Eye, CheckCircle2
} from 'lucide-react';
import { buildBloquePago } from '@/lib/saas-pago-utils';
import { generarReciboSaaSPDFBase64 } from '@/lib/recibo-saas-utils';

export default function SaasCobranzaPage() {
  const [cargando, setCargando] = useState(true);
  const [clubes, setClubes] = useState<any[]>([]);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [activosPorClub, setActivosPorClub] = useState<Record<string, number>>({});
  
  // Filtros y Pestañas
  const [activeTab, setActiveTab] = useState<'estado_cuentas' | 'facturas' | 'pagos' | 'recibos'>('estado_cuentas');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstadoFactura, setFiltroEstadoFactura] = useState('Todos');
  const [filtroMes, setFiltroMes] = useState('Todos');
  const [filtroAnio, setFiltroAnio] = useState('Todos');
  const [filtroTipoRecibo, setFiltroTipoRecibo] = useState<'Todos' | 'pago' | 'cobro'>('Todos');

  // Modal registrar pago
  const [isModalPagoOpen, setIsModalPagoOpen] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<any>(null);
  const [montoPagado, setMontoPagado] = useState('');
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  const [comprobanteUrl, setComprobanteUrl] = useState('');
  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().split('T')[0]);

  // Modal Recibo Generado tras Registrar Pago
  const [reciboGenerado, setReciboGenerado] = useState<any>(null);

  // Modal generar facturas
  const [isModalGenerarOpen, setIsModalGenerarOpen] = useState(false);
  const [mesGenerar, setMesGenerar] = useState(() => new Date().getMonth() + 1);
  const [anioGenerar, setAnioGenerar] = useState(() => new Date().getFullYear());

  // Modal Vista Previa / Notificar WhatsApp
  const [isModalPreviewOpen, setIsModalPreviewOpen] = useState(false);
  const [clubPreview, setClubPreview] = useState<any>(null);
  const [facturaPreview, setFacturaPreview] = useState<any>(null);
  const [mensajePreview, setMensajePreview] = useState('');
  const [enviandoWA, setEnviandoWA] = useState(false);
  const [enviandoMasivo, setEnviandoMasivo] = useState(false);
  const [configSuperAdmin, setConfigSuperAdmin] = useState<any>(null);

  // Edición de fecha de corte
  const [editingCorteId, setEditingCorteId] = useState<string | null>(null);
  const [editingCorteFecha, setEditingCorteFecha] = useState<string>('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // 0. Cargar config superadmin mediante API server (bypasses RLS)
      try {
        const resConfig = await fetch('/api/admin/configuracion', { cache: 'no-store' });
        if (resConfig.ok) {
          const configJson = await resConfig.json();
          const raw = configJson.raw || {};
          const medios = configJson.medios_de_pago || {};
          setConfigSuperAdmin({
            telefono_soporte: raw.telefono_soporte || '',
            mensaje_cobro: raw.mensaje_cobro,
            ...medios
          });
        }
      } catch (e) {
        console.error("Error al cargar configSuperAdmin en cobranza:", e);
      }

      // 1. Cargar clubes con sus planes
      const { data: clubesData } = await supabase
        .from('clubes')
        .select('*, planes_saas(id, nombre, precio_base, limite_jugadores_base, precio_jugador_extra)')
        .neq('estado', 'Eliminado')
        .order('nombre');
      
      // 2. Cargar todas las facturas
      const { data: facturasData } = await supabase
        .from('facturacion_mensual')
        .select('*, clubes(nombre, slug, telefono_contacto)')
        .order('created_at', { ascending: false });

      // 3. Cargar todos los pagos (vía API para saltar RLS)
      const resPagos = await fetch('/api/admin/pagos-saas');
      if (resPagos.ok) {
        const resultPagos = await resPagos.json();
        if (resultPagos.data) setPagos(resultPagos.data);
      }

      // 4. Calcular atletas activos por club para el MRR
      const { data: perfilesData } = await supabase
        .from('perfiles')
        .select('club_id')
        .eq('estado_miembro', 'Activo')
        .eq('rol', 'Futbolista');

      const conteoMap: Record<string, number> = {};
      perfilesData?.forEach((p: any) => {
        if (p.club_id) {
          conteoMap[p.club_id] = (conteoMap[p.club_id] || 0) + 1;
        }
      });

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
      const { error } = await supabase.functions.invoke('facturacion-mensual');
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
      // 1. Guardar en pagos_saas y marcar factura como pagada (vía API)
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

      // 2. Extender suscripción del club
      const resSuscripcion = await fetch('/api/admin/suscripciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: facturaSeleccionada.club_id, meses: 1, es_prueba: false })
      });
      const dataSusc = await resSuscripcion.json();
      if (dataSusc.error) throw new Error(dataSusc.error);

      toast.success('Pago registrado y membresía extendida 🚀', { id: toastId });

      // 3. Preparar recibo generado para modal interactivo inteligente
      const clubMatch = clubes.find(c => c.id === facturaSeleccionada.club_id);
      const mesNombre = nombreMes(facturaSeleccionada.periodo_mes);
      const consecutivoUnico = dataPago.pago_id ? dataPago.pago_id.slice(-4).toUpperCase() : String(Math.floor(1000 + Math.random() * 9000));

      setReciboGenerado({
        pago_id: dataPago.pago_id,
        factura_id: facturaSeleccionada.id,
        club_id: facturaSeleccionada.club_id,
        club_nombre: facturaSeleccionada.clubes?.nombre || clubMatch?.nombre || 'Club',
        club_slug: facturaSeleccionada.clubes?.slug || clubMatch?.slug || '',
        club_telefono: clubMatch?.telefono_contacto || '',
        consecutivo: consecutivoUnico,
        monto_total: Number(montoPagado),
        metodo_pago: metodoPago,
        fecha: fechaPago,
        mes_cobrado: `${mesNombre} ${facturaSeleccionada.periodo_anio}`,
        cantidad_jugadores: facturaSeleccionada.cantidad_jugadores || 0,
        tipo: 'pago'
      });

      setIsModalPagoOpen(false);
      cargarDatos();
    } catch (e: any) {
      toast.error('Error al registrar pago: ' + e.message, { id: toastId });
    }
  };

  const eliminarPago = async (pago: any) => {
    const confirmar = window.confirm(`¿Estás seguro de eliminar este pago por $${Number(pago.monto_pagado).toLocaleString('es-CO')}? Esto cambiará el estado de la factura a pendiente.`);
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

  // Abrir Modal de Notificación Intuitivo
  const abrirModalPreview = (club: any, factura?: any) => {
    setClubPreview(club);
    setFacturaPreview(factura || null);

    const atletas = activosPorClub[club.id] || 0;
    const plan = club.planes_saas;
    const precioBase = plan ? Number(plan.precio_base ?? 100000) : 100000;
    const limiteBase = plan ? Number(plan.limite_jugadores_base ?? 60) : 60;
    const precioExtra = plan ? Number(plan.precio_jugador_extra ?? 2000) : 2000;
    const extras = Math.max(0, atletas - limiteBase);
    const montoCalculado = factura?.total_pagar ? Number(factura.total_pagar) : (precioBase + (extras * precioExtra));

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const hoy = new Date();
    const mesNombre = factura?.periodo_mes ? meses[factura.periodo_mes - 1] : meses[hoy.getMonth()];
    const anio = factura?.periodo_anio || hoy.getFullYear();
    const fechaCorteRaw = club.proximo_corte || `${anio}-${String(hoy.getMonth() + 1).padStart(2, '0')}-05`;
    let fechaCorteStr = fechaCorteRaw;
    try {
      fechaCorteStr = new Date(fechaCorteRaw).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) {}

    const bloquePago = buildBloquePago(configSuperAdmin || {});

    const borrador = `Hola *${club.nombre}* 👋⚽,\n\nUn cordial saludo de parte del equipo de *Master Club Manager (MCM)*.\n\nTe recordamos que se encuentra pendiente el aporte de tu mensualidad SaaS correspondiente a *${mesNombre} ${anio}*.\n\n📄 *Detalles de tu Suscripción:*\n• Plan: *${plan?.nombre || 'Estándar'}*\n• Atletas Activos: *${atletas}*\n• Total a Pagar: *$ ${montoCalculado.toLocaleString('es-CO')}*\n• Fecha de Corte: *${fechaCorteStr}*\n\n💳 *Medios de Pago Disponibles:*\n${bloquePago}\n• Acceso Directo: *https://www.masterclubmanager.com/${club.slug}/login*\n\nPor favor envíanos tu comprobante por este medio una vez realizado el pago para mantener tu plataforma 100% activa. ¡Gracias por tu confianza! 🏆`;

    setMensajePreview(borrador);
    setIsModalPreviewOpen(true);
  };

  const confirmarEnvioWhatsApp = async () => {
    if (!clubPreview) return;
    setEnviandoWA(true);
    const toastId = toast.loading(`Enviando WhatsApp a ${clubPreview.nombre}...`);
    try {
      const res = await fetch('/api/admin/cobranza/enviar-recordatorio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          club_id: clubPreview.id,
          factura_id: facturaPreview?.id,
          mensajePersonalizado: mensajePreview
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success(`Recordatorio de cobranza enviado a ${clubPreview.nombre} 🚀`, { id: toastId });
      setIsModalPreviewOpen(false);
    } catch (err: any) {
      toast.error('Error al enviar: ' + err.message, { id: toastId });
    } finally {
      setEnviandoWA(false);
    }
  };

  const enviarRecordatoriosMasivos = async () => {
    const confirmar = window.confirm('¿Confirmas que deseas enviar recordatorios de cobro por WhatsApp a TODOS los clubes morosos o vencidos?');
    if (!confirmar) return;

    setEnviandoMasivo(true);
    const toastId = toast.loading('Notificando a todos los clubes morosos por WhatsApp...');
    try {
      const res = await fetch('/api/admin/cobranza/notificar-todos-pendientes', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success(`Proceso masivo completado. Enviados: ${data.enviados}, Fallidos: ${data.fallidos}`, { id: toastId, duration: 6000 });
      cargarDatos();
    } catch (err: any) {
      toast.error('Error en proceso masivo: ' + err.message, { id: toastId });
    } finally {
      setEnviandoMasivo(false);
    }
  };

  // --- MÉTODOS DE MANEJO DE RECIBOS INTELIGENTES ---
  const reimprimirReciboSaaS = async (recibo: any) => {
    const toastId = toast.loading("Generando PDF de " + (recibo.tipo === 'pago' ? 'Comprobante' : 'Cuenta de Cobro') + "...");
    try {
      const pdfBase64 = await generarReciboSaaSPDFBase64({
        clubNombre: recibo.club_nombre,
        clubDocumento: recibo.club_documento || 'N/A',
        clubTelefono: recibo.club_telefono || '',
        mesCobrado: recibo.mes_cobrado,
        cantidadJugadores: recibo.cantidad_jugadores || 0,
        montoTotal: recibo.monto_total,
        consecutivo: recibo.consecutivo,
        metodoPago: recibo.metodo_pago || (recibo.tipo === 'pago' ? 'Suscripción SaaS' : undefined),
        fechaPago: recibo.fecha,
        tipoRecibo: recibo.tipo
      });

      const byteArray = new Uint8Array(atob(pdfBase64).split('').map(c => c.charCodeAt(0)));
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      win?.focus();
      toast.success("PDF generado exitosamente 🚀", { id: toastId });
    } catch (e: any) {
      toast.error("Error al generar PDF: " + e.message, { id: toastId });
    }
  };

  const reenviarWhatsAppRecibo = async (recibo: any) => {
    const clubMatch = clubes.find(c => c.id === recibo.club_id) || { nombre: recibo.club_nombre, slug: recibo.club_slug, id: recibo.club_id, telefono_contacto: recibo.club_telefono };
    setClubPreview(clubMatch);
    setFacturaPreview(recibo.factura_id ? { id: recibo.factura_id } : null);

    let borrador = '';
    if (recibo.tipo === 'pago') {
      borrador = `¡Hola *${recibo.club_nombre}*! 👋\n\nConfirmamos el recibo de tu pago de la suscripción SaaS correspondiente a *${recibo.mes_cobrado}* por un valor de *$ ${recibo.monto_total.toLocaleString('es-CO')}* (Vía ${recibo.metodo_pago || 'Transferencia'}).\n\n📄 Adjuntamos tu *Comprobante Oficial de Pago* en PDF.\n\n¡Gracias por tu confianza en *Master Club Manager*! 🏆✨`;
    } else {
      const bloquePago = buildBloquePago(configSuperAdmin || {});
      borrador = `Hola *${recibo.club_nombre}* 👋⚽,\n\nTe recordamos que se encuentra pendiente el aporte de tu mensualidad SaaS correspondiente a *${recibo.mes_cobrado}* por un valor de *$ ${recibo.monto_total.toLocaleString('es-CO')}*.\n\n📄 *Detalles de tu Suscripción:*\n• Total a Pagar: *$ ${recibo.monto_total.toLocaleString('es-CO')}*\n• Fecha de Corte: *${recibo.fecha_corte || 'En transcurso'}*\n\n💳 *Medios de Pago Disponibles:*\n${bloquePago}\n• Acceso Directo: *https://www.masterclubmanager.com/${recibo.club_slug || ''}/login*\n\nPor favor envíanos tu comprobante por este medio una vez realizado el pago para mantener tu plataforma 100% activa. ¡Gracias por tu confianza! 🏆`;
    }

    setMensajePreview(borrador);
    setIsModalPreviewOpen(true);
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

  // --- CONSTRUCCIÓN DEL HISTORIAL UNIFICADO DE RECIBOS DEL MES ---
  const hoyAnio = new Date().getFullYear();
  const hoyMesIndex = new Date().getMonth() + 1;

  const recibosPagoLista = pagos.map(p => {
    const clubMatch = clubes.find(c => c.id === p.club_id);
    const fechaObj = p.fecha_pago ? new Date(p.fecha_pago) : new Date();
    const mesNombre = nombreMes(fechaObj.getMonth() + 1);
    return {
      id: `pago-${p.id}`,
      pago_id: p.id,
      consecutivo: p.id.slice(-4).toUpperCase(),
      club_id: p.club_id,
      club_nombre: p.clubes?.nombre || clubMatch?.nombre || 'Club',
      club_slug: clubMatch?.slug || '',
      club_telefono: clubMatch?.telefono_contacto || '',
      monto_total: Number(p.monto_pagado || 0),
      metodo_pago: p.metodo_pago || 'Suscripción SaaS',
      fecha: p.fecha_pago || new Date().toISOString(),
      mes_cobrado: `${mesNombre} ${fechaObj.getFullYear()}`,
      cantidad_jugadores: activosPorClub[p.club_id] || 0,
      tipo: 'pago' as const,
      estado_label: 'PAGO CONFIRMADO'
    };
  });

  const recibosCobroLista = facturas
    .filter(f => f.estado_pago !== 'pagado')
    .map(f => {
      const clubMatch = clubes.find(c => c.id === f.club_id);
      const mesNombre = nombreMes(f.periodo_mes);
      const isVencido = clubMatch?.proximo_corte ? new Date(clubMatch.proximo_corte) < new Date() : false;
      return {
        id: `factura-${f.id}`,
        factura_id: f.id,
        consecutivo: String(f.id).slice(0, 5).toUpperCase(),
        club_id: f.club_id,
        club_nombre: f.clubes?.nombre || clubMatch?.nombre || 'Club',
        club_slug: f.clubes?.slug || clubMatch?.slug || '',
        club_telefono: clubMatch?.telefono_contacto || '',
        monto_total: Number(f.total_pagar || 0),
        metodo_pago: undefined,
        fecha: f.created_at || new Date().toISOString(),
        fecha_corte: clubMatch?.proximo_corte || `${f.periodo_anio}-${String(f.periodo_mes).padStart(2, '0')}-05`,
        mes_cobrado: `${mesNombre} ${f.periodo_anio}`,
        cantidad_jugadores: f.cantidad_jugadores || activosPorClub[f.club_id] || 0,
        tipo: 'cobro' as const,
        estado_label: isVencido ? 'COBRO VENCIDO' : 'CUENTA DE COBRO'
      };
    });

  const todosRecibosUnificados = [...recibosPagoLista, ...recibosCobroLista].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  const recibosFiltrados = todosRecibosUnificados.filter(r => {
    const matchesSearch = r.club_nombre.toLowerCase().includes(busqueda.toLowerCase()) || r.consecutivo.toLowerCase().includes(busqueda.toLowerCase());
    const matchesTipo = filtroTipoRecibo === 'Todos' || r.tipo === filtroTipoRecibo;
    return matchesSearch && matchesTipo;
  });

  // --- FILTROS DE LISTAS DE OTRAS PESTAÑAS ---
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
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <CreditCard className="text-lime-500 w-8 h-8" /> Cobranza Multiclub SaaS
          </h1>
          <p className="text-slate-500 font-medium mt-1">Control de pagos de membresías, emisión de recibos inteligentes y notificaciones por WhatsApp.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={enviarRecordatoriosMasivos}
            disabled={enviandoMasivo}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-2xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            {enviandoMasivo ? <Loader2 size={18} className="animate-spin" /> : <Smartphone size={18} />}
            {enviandoMasivo ? 'Notificando...' : 'Notificar Cobros (WhatsApp)'}
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

      {/* KPIS Y MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">MRR Proyectado</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500"><TrendingUp size={16}/></div>
          </div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">{formatearDinero(mrrTotal)}</h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">Proyección base mensual</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recaudado (Este Mes)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500"><CheckCircle size={16}/></div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 tracking-tight">{formatearDinero(cobradoMes)}</h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">De {formatearDinero(facturadoMes)} facturados</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Deuda Pendiente</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-500"><AlertTriangle size={16}/></div>
          </div>
          <h3 className="text-2xl font-black text-red-600 tracking-tight">{formatearDinero(deudasTotales)}</h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">Acumulado en mora</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recibos del Mes</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500"><FileText size={16}/></div>
          </div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">{todosRecibosUnificados.length} Emitidos</h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">{recibosPagoLista.length} pagos / {recibosCobroLista.length} cobros</p>
        </div>
      </div>

      {/* PESTAÑAS DE CONTROL ESTILO DIRECTOR */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button 
          onClick={() => { setActiveTab('estado_cuentas'); setBusqueda(''); }}
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'estado_cuentas' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
        >
          <Building2 size={16} /> Estado de Cuentas por Club
        </button>
        <button 
          onClick={() => { setActiveTab('facturas'); setBusqueda(''); }}
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'facturas' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
        >
          <Calendar size={16} /> Facturas Emitidas ({facturas.length})
        </button>
        <button 
          onClick={() => { setActiveTab('pagos'); setBusqueda(''); }}
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'pagos' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
        >
          <CheckCircle size={16} /> Historial de Pagos ({pagos.length})
        </button>
        <button 
          onClick={() => { setActiveTab('recibos'); setBusqueda(''); }}
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'recibos' ? 'bg-lime-500 text-white shadow-md shadow-lime-500/20' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
        >
          <FileText size={16} /> Recibos y Comprobantes del Mes ({todosRecibosUnificados.length})
        </button>
      </div>

      {/* CONTROLES / FILTROS DE BÚSQUEDA */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
            placeholder="Buscar por academia, slug o N° de recibo..." 
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime-500/35 focus:bg-white transition-all text-slate-800 font-medium"
          />
        </div>

        {activeTab === 'recibos' && (
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setFiltroTipoRecibo('Todos')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all ${filtroTipoRecibo === 'Todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Todos ({todosRecibosUnificados.length})
            </button>
            <button
              onClick={() => setFiltroTipoRecibo('pago')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all ${filtroTipoRecibo === 'pago' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
            >
              Pagos Confirmados ({recibosPagoLista.length})
            </button>
            <button
              onClick={() => setFiltroTipoRecibo('cobro')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all ${filtroTipoRecibo === 'cobro' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
            >
              Cuentas de Cobro ({recibosCobroLista.length})
            </button>
          </div>
        )}

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

      {/* CONTENIDO DE PESTAÑA: ESTADO DE CUENTAS POR CLUB */}
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
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Acciones</th>
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
                        <div className="font-bold text-slate-800 text-sm">{plan?.nombre}</div>
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
                              <CheckCircle size={14} />
                            </button>
                            <button 
                              onClick={cancelarEdicionCorte}
                              className="p-1.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                              title="Cancelar"
                            >
                              <X size={14} />
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
                              <Calendar size={14} />
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
                        <button
                          onClick={() => abrirModalPreview(club)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 mx-auto shadow-sm"
                          title="Enviar recordatorio de cobro por WhatsApp"
                        >
                          <Smartphone size={14} /> Notificar
                        </button>
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
                      {fac.estado_pago !== 'pagado' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => abrirModalPago(fac)}
                            className="bg-lime-500 hover:bg-lime-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm"
                          >
                            Registrar Pago
                          </button>
                          <button 
                            onClick={() => {
                              const clubMatch = clubes.find(c => c.id === fac.club_id);
                              if (clubMatch) abrirModalPreview(clubMatch, fac);
                            }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 p-2 rounded-xl transition-all shadow-sm"
                            title="Enviar recordatorio WhatsApp de esta factura"
                          >
                            <Smartphone size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Completada ✅</span>
                      )}
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
                      <button 
                        onClick={() => reimprimirReciboSaaS({
                          club_nombre: p.clubes?.nombre || 'Club',
                          mes_cobrado: nombreMes(new Date(p.fecha_pago).getMonth() + 1) + ' ' + new Date(p.fecha_pago).getFullYear(),
                          consecutivo: p.id.slice(-4).toUpperCase(),
                          monto_total: Number(p.monto_pagado),
                          metodo_pago: p.metodo_pago,
                          fecha: p.fecha_pago,
                          tipo: 'pago'
                        })}
                        className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 justify-center mx-auto"
                        title="Ver Comprobante PDF de Pago"
                      >
                        <FileText size={14}/> Ver PDF
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => reenviarWhatsAppRecibo({
                            club_id: p.club_id,
                            club_nombre: p.clubes?.nombre || 'Club',
                            mes_cobrado: nombreMes(new Date(p.fecha_pago).getMonth() + 1) + ' ' + new Date(p.fecha_pago).getFullYear(),
                            monto_total: Number(p.monto_pagado),
                            metodo_pago: p.metodo_pago,
                            tipo: 'pago'
                          })}
                          className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl transition-colors"
                          title="Enviar Comprobante por WhatsApp"
                        >
                          <Send size={16}/>
                        </button>
                        <button 
                          onClick={() => eliminarPago(p)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
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

      {/* CONTENIDO DE PESTAÑA & SECCIÓN INFERIOR: HISTORIAL DE RECIBOS DEL MES */}
      {(activeTab === 'recibos' || activeTab === 'estado_cuentas') && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="text-lime-500 w-6 h-6" /> Recibos y Comprobantes Emitidos este Mes
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Historial unificado de cuentas de cobro y confirmaciones de pago. Reimprime en PDF o reenvía por WhatsApp.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total: {recibosFiltrados.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">N° Recibo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo de Recibo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Academia / Club</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Período</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Monto Total</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Acciones Inteligentes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recibosFiltrados.map((recibo) => {
                  const esPago = recibo.tipo === 'pago';

                  return (
                    <tr key={recibo.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">
                        #{recibo.consecutivo}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          esPago 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : (recibo.estado_label.includes('VENCIDO') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200')
                        }`}>
                          {recibo.estado_label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {recibo.club_nombre}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">
                        {recibo.mes_cobrado}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">
                        {formatearDinero(recibo.monto_total)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => reimprimirReciboSaaS(recibo)}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                            title="Reimprimir o Descargar PDF"
                          >
                            <Printer size={14} /> Reimprimir PDF
                          </button>

                          <button
                            onClick={() => reenviarWhatsAppRecibo(recibo)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                            title="Reenviar mensaje inteligente por WhatsApp"
                          >
                            <Smartphone size={14} /> Reenviar WhatsApp
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {recibosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No hay recibos registrados en este período.
                    </td>
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
                    <option value="Llave Bre-B (@DAVIBMT801)">Llave Bre-B (@DAVIBMT801)</option>
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

      {/* MODAL INTELIGENTE DE RECIBO GENERADO TRAS REGISTRAR PAGO */}
      {reciboGenerado && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900 text-white text-center relative">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-black">¡Comprobante de Pago Generado!</h3>
              <p className="text-xs text-slate-400 mt-1">N° Recibo: #{reciboGenerado.consecutivo}</p>
              <button 
                onClick={() => setReciboGenerado(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center space-y-1">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Academia</p>
                <p className="font-black text-slate-900 text-base">{reciboGenerado.club_nombre}</p>
                <p className="text-2xl font-black text-emerald-600 pt-2">{formatearDinero(reciboGenerado.monto_total)}</p>
                <p className="text-xs text-slate-500 font-medium">{reciboGenerado.mes_cobrado} • Vía {reciboGenerado.metodo_pago}</p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    reenviarWhatsAppRecibo(reciboGenerado);
                    setReciboGenerado(null);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 text-sm"
                >
                  <Smartphone size={18} /> Enviar Comprobante por WhatsApp (Auto)
                </button>

                <button
                  onClick={() => {
                    reimprimirReciboSaaS(reciboGenerado);
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Printer size={16} /> Imprimir / Descargar Comprobante PDF
                </button>

                <button
                  onClick={() => setReciboGenerado(null)}
                  className="w-full bg-transparent text-slate-400 font-bold py-2 hover:text-slate-600 text-xs"
                >
                  Cerrar Ventana
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

      {/* MODAL VISTA PREVIA / NOTIFICAR WHATSAPP */}
      {isModalPreviewOpen && clubPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">Notificar por WhatsApp</h3>
                  <p className="text-slate-400 text-xs font-medium">Academia: {clubPreview.nombre}</p>
                </div>
              </div>
              <button onClick={() => setIsModalPreviewOpen(false)} className="text-slate-400 hover:text-white p-1 transition-colors"><X size={20}/></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900">Teléfono Destino:</span>
                <span className="font-mono font-black text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                  {clubPreview.telefono_contacto || 'Buscando teléfono de Director...'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                  <span>Borrador del Mensaje</span>
                  <span className="text-[10px] text-slate-400 font-normal">Puedes editar el texto antes de enviar</span>
                </label>
                <textarea
                  rows={10}
                  value={mensajePreview}
                  onChange={e => setMensajePreview(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed custom-scrollbar"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalPreviewOpen(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEnvioWhatsApp}
                  disabled={enviandoWA}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {enviandoWA ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {enviandoWA ? 'Enviando...' : 'Enviar por WhatsApp'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
