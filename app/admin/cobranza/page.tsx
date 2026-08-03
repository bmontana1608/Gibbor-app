'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Building2, CreditCard, DollarSign, Calendar, Search, 
  CheckCircle, FileText, Trash2, PlusCircle, X, 
  Loader2, Activity, Users, ArrowUpRight, TrendingUp, AlertTriangle
} from 'lucide-react';

export default function SaasCobranzaPage() {
  const [cargando, setCargando] = useState(true);
  const [clubes, setClubes] = useState<any[]>([]);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [activosPorClub, setActivosPorClub] = useState<Record<string, number>>({});
  
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
      
      // 2. Cargar todas las facturas
      const { data: facturasData } = await supabase
        .from('facturacion_mensual')
        .select('*, clubes(nombre, slug)')
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

  const enviarReciboManual = async (pago: any) => {
    const toastId = toast.loading('Generando y enviando recibo...');
    try {
      const res = await fetch('/api/admin/enviar-recibo-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pago_id: pago.id })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      toast.success('Recibo enviado correctamente', { id: toastId });
    } catch (e: any) {
      toast.error('Error al enviar: ' + e.message, { id: toastId });
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
        <div className="flex gap-3">
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
                        <div className="font-bold text-slate-800 text-sm">{plan.nombre}</div>
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
                        <button 
                          onClick={() => abrirModalPago(fac)}
                          className="bg-lime-500 hover:bg-lime-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm"
                        >
                          Registrar Pago
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Completada</span>
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
                      <button 
                        onClick={() => eliminarPago(p)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
                        title="Eliminar registro de pago"
                      >
                        <Trash2 size={16}/>
                      </button>
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

    </div>
  );
}
