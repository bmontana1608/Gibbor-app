'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Shirt, Search, PlusCircle, CreditCard, ChevronRight, 
  Trash2, X, DollarSign, TrendingUp, Scissors, CheckCircle, Receipt, ExternalLink 
} from 'lucide-react';

import { useTenant } from '@/lib/hooks/useTenant';
import { useTranslation } from '@/lib/i18n/LanguageContext';

export default function UniformesModule() {
  const { t } = useTranslation();
  const router = useRouter();
  const { route, slug: tenantSlug } = useTenant();
  const [cargando, setCargando] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]);
  
  // Dashboard states
  const [stats, setStats] = useState({
    totalCosto: 0,
    totalVenta: 0,
    totalAbonado: 0,
    gananciaEstimada: 0,
    porCobrar: 0
  });

  // Modal Nuevo/Editar Pedido
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pedidoActual, setPedidoActual] = useState<any>(null);
  
  // Form fields
  const [jugadorId, setJugadorId] = useState('');
  const [tallaCamisa, setTallaCamisa] = useState('');
  const [tallaShort, setTallaShort] = useState('');
  const [dorsal, setDorsal] = useState('');
  const [costoProveedor, setCostoProveedor] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [abono, setAbono] = useState('');
  const [estadoPedido, setEstadoPedido] = useState('Pendiente');
  const [notas, setNotas] = useState('');
  const [busquedaJugador, setBusquedaJugador] = useState('');

  // Modal Registrar Abono (independiente)
  const [isModalAbonoOpen, setIsModalAbonoOpen] = useState(false);
  const [nuevoAbonoMonto, setNuevoAbonoMonto] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const tenantRes = await fetch('/api/tenant?slug=' + tenantSlug);
      const tenantData = await tenantRes.json();
      setTenant(tenantData);

      if (!tenantData.id) {
        router.push('/login');
        return;
      }

      // Traer jugadores activos para el select
      const { data: jugData } = await supabase
        .from('perfiles')
        .select('id, nombres, apellidos, grupos')
        .eq('club_id', tenantData.id)
        .eq('rol', 'Futbolista')
        .neq('estado_miembro', 'Pendiente')
        .order('nombres', { ascending: true });
        
      if (jugData) setJugadores(jugData);

      // Traer pedidos
      const { data: pedData } = await supabase
        .from('pedidos_uniformes')
        .select(`
          *,
          perfiles:jugador_id (nombres, apellidos, grupos)
        `)
        .eq('club_id', tenantData.id)
        .order('fecha_pedido', { ascending: false });

      if (pedData) {
        setPedidos(pedData);
        calcularStats(pedData);
      }

    } catch (e) {
      console.error(e);
      toast.error(t('uniformes.errorCargandoDatos'));
    } finally {
      setCargando(false);
    }
  };

  const calcularStats = (data: any[]) => {
    let costo = 0, venta = 0, abonado = 0;
    data.forEach(p => {
      costo += Number(p.costo_proveedor || 0);
      venta += Number(p.precio_venta || 0);
      abonado += Number(p.abono || 0);
    });
    
    setStats({
      totalCosto: costo,
      totalVenta: venta,
      totalAbonado: abonado,
      gananciaEstimada: venta - costo,
      porCobrar: venta - abonado
    });
  };

  const abrirModalNuevo = () => {
    setPedidoActual(null);
    setJugadorId('');
    setTallaCamisa('');
    setTallaShort('');
    setDorsal('');
    setCostoProveedor('');
    setPrecioVenta('');
    setAbono('0');
    setEstadoPedido('Pendiente');
    setNotas('');
    setIsModalOpen(true);
  };

  const abrirModalEditar = (pedido: any) => {
    setPedidoActual(pedido);
    setJugadorId(pedido.jugador_id);
    setTallaCamisa(pedido.talla_camisa || '');
    setTallaShort(pedido.talla_short || '');
    setDorsal(pedido.dorsal || '');
    setCostoProveedor(String(pedido.costo_proveedor || ''));
    setPrecioVenta(String(pedido.precio_venta || ''));
    setAbono(String(pedido.abono || ''));
    setEstadoPedido(pedido.estado_pedido);
    setNotas(pedido.notas || '');
    setIsModalOpen(true);
  };

  const guardarPedido = async () => {
    if (!jugadorId || !precioVenta) {
      return toast.error(t('uniformes.jugadorVentaObligatorios'));
    }

    const toastId = toast.loading(t('uniformes.guardandoPedido'));
    
    const pVenta = Number(precioVenta);
    const pCosto = Number(costoProveedor || 0);
    const pAbono = Number(abono || 0);
    const estadoPago = pAbono >= pVenta ? 'Pagado' : (pAbono > 0 ? 'Abonado' : 'Pendiente');

    const payload = {
      club_id: tenant.id,
      jugador_id: jugadorId,
      talla_camisa: tallaCamisa,
      talla_short: tallaShort,
      dorsal: dorsal,
      costo_proveedor: pCosto,
      precio_venta: pVenta,
      abono: pAbono,
      estado_pedido: estadoPedido,
      estado_pago: estadoPago,
      notas
    };

    try {
      if (pedidoActual) {
        const { error } = await supabase.from('pedidos_uniformes').update(payload).eq('id', pedidoActual.id);
        if (error) throw error;
      } else {
        const { error, data } = await supabase.from('pedidos_uniformes').insert([payload]).select().single();
        if (error) throw error;
        
        // Si el usuario registró un abono inicial mayor a 0, lo sumamos a los ingresos generales del club
        if (pAbono > 0 && data) {
          await registrarIngresoFinanciero(jugadorId, pAbono, `Abono inicial de uniforme`);
        }
      }
      
      toast.success(t('uniformes.pedidoGuardado'), { id: toastId });
      setIsModalOpen(false);
      cargarDatos();
    } catch (err: any) {
      toast.error(`${t('uniformes.errorGuardar')}${err.message}`, { id: toastId });
    }
  };

  const registrarPagoProveedor = async (pedido: any) => {
    if (pedido.costo_liquidado) return toast.info(t('uniformes.costoYaLiquidado'));
    if (!window.confirm(`${t('uniformes.deseasRegistrarPago')}${Number(pedido.costo_proveedor).toLocaleString()}${t('uniformes.alProveedorEgreso')}`)) return;

    const toastId = toast.loading(t('uniformes.registrandoEgreso'));
    try {
      // 1. Marcar como liquidado en la tabla de uniformes
      const { error: errUpd } = await supabase
        .from('pedidos_uniformes')
        .update({ costo_liquidado: true })
        .eq('id', pedido.id);
      
      if (errUpd) throw errUpd;

      // 2. Registrar en pagos_egresos
      const d = new Date();
      const fechaLet = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');

      const { error: errEgr } = await supabase.from('pagos_egresos').insert([{
        club_id: tenant.id,
        descripcion: `PAGO PROVEEDOR: Uniforme de ${pedido.perfiles.nombres} ${pedido.perfiles.apellidos}`,
        monto: Number(pedido.costo_proveedor),
        categoria: 'Uniformes',
        fecha: fechaLet
      }]);

      if (errEgr) throw errEgr;

      toast.success(t('uniformes.gastoRegistradoContabilidad'), { id: toastId });
      cargarDatos();
    } catch (err: any) {
      toast.error(`${t('uniformes.errorLiquidar')}${err.message}`, { id: toastId });
    }
  };

  const eliminarPedido = async (id: string) => {
    if (!window.confirm(t('uniformes.seguroEliminarPedido'))) return;
    const toastId = toast.loading(t('uniformes.eliminando'));
    try {
      const { error } = await supabase.from('pedidos_uniformes').delete().eq('id', id);
      if (error) throw error;
      toast.success(t('uniformes.eliminadoCorrectamente'), { id: toastId });
      cargarDatos();
    } catch (err: any) {
      toast.error(`${t('uniformes.error')}${err.message}`, { id: toastId });
    }
  };

  // NOTA DE DISEÑO: Los uniformes tienen su propio "bolsillo" financiero (pedidos_uniformes).
  // NO se inyectan en pagos_ingresos para mantener el historial de mensualidades limpio.
  // El dashboard de uniformes ya muestra cartera, abonos y ganancias de forma independiente.
  const registrarIngresoFinanciero = async (_jId: string, _monto: number, _nota: string) => {
    // Intencionalmente desactivado: ver comentario arriba.
  };

  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
  const [pedidoAbono, setPedidoAbono] = useState<any>(null);
  const [montoAbonoExtra, setMontoAbonoExtra] = useState('');
  const [busquedaAlumno, setBusquedaAlumno] = useState('');

  const registrarNuevoAbono = async () => {
    if (!pedidoActual || !nuevoAbonoMonto) return;
    const montoSumar = Number(nuevoAbonoMonto);
    if (montoSumar <= 0) return toast.error("El abono debe ser mayor a 0");

    const toastId = toast.loading("Procesando pago...");
    
    const nuevoTotalAbono = Number(pedidoActual.abono || 0) + montoSumar;
    const precioVent = Number(pedidoActual.precio_venta || 0);
    const estadoPago = nuevoTotalAbono >= precioVent ? 'Pagado' : 'Abonado';
    
    try {
      const { error } = await supabase
        .from('pedidos_uniformes')
        .update({ abono: nuevoTotalAbono, estado_pago: estadoPago })
        .eq('id', pedidoActual.id);
      if (error) throw error;
      toast.success("Abono registrado correctamente", { id: toastId });
      setIsModalAbonoOpen(false);
      setNuevoAbonoMonto('');
      cargarDatos();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`, { id: toastId });
    }
  };

  const procesarAbonoExtra = async () => {
    const abonoNum = Number(montoAbonoExtra);
    if (!abonoNum || abonoNum <= 0) return toast.error(t('uniformes.abonoMayorCero'));
    
    if (!pedidoAbono) return;

    const toastId = toast.loading(t('uniformes.procesandoPago'));

    try {
      const nuevoAbono = Number(pedidoAbono.abono || 0) + abonoNum;
      const estadoPago = nuevoAbono >= Number(pedidoAbono.precio_venta) ? 'Pagado' : 'Abonado';

      // 1. Actualizar el pedido
      const { error: errUpd } = await supabase
        .from('pedidos_uniformes')
        .update({ 
          abono: nuevoAbono, 
          estado_pago: estadoPago 
        })
        .eq('id', pedidoAbono.id);
        
      if (errUpd) throw errUpd;

      // 2. Registrar el INGRESO general en el club
      await registrarIngresoFinanciero(
        pedidoAbono.jugador_id, 
        abonoNum, 
        `Abono de Uniforme`
      );

      toast.success(`${t('uniformes.abonoRegistradoInyectado')}${abonoNum.toLocaleString()}${t('uniformes.aLosIngresosClub')}`, { id: toastId });
      setIsAbonoModalOpen(false);
      setMontoAbonoExtra('');
      cargarDatos();

    } catch (err: any) {
      toast.error(`${t('uniformes.errorRegistrarAbono')}${err.message}`, { id: toastId });
    }
  };


  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-400 bg-slate-50">
        <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-sm tracking-widest uppercase">{t('uniformes.cargandoModuloUniformes')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-3">
             <Shirt className="text-brand w-8 h-8" /> {t('uniformes.dotacionUniformes')}
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {t('uniformes.controlaPedidosTallas')}
          </p>
        </div>
        <button 
          onClick={abrirModalNuevo}
          className="bg-slate-900 text-white hover:bg-slate-800 px-6 py-3 rounded-2xl font-black text-sm uppercase flex items-center gap-2 transition-all shadow-xl shadow-slate-900/10"
        >
          <PlusCircle className="w-5 h-5" /> {t('uniformes.nuevoPedido')}
        </button>
      </div>

      {/* DASHBOARD INTELIGENTE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ingreso Proyectado</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{'$'}{stats.totalVenta.toLocaleString('es-CO')}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-bold">Valor de cobro total</p>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-rose-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Costo Proveedor</p>
            <h3 className="text-3xl font-black text-rose-600">{'$'}{stats.totalCosto.toLocaleString('es-CO')}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-bold">Gastos de fabricación</p>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-emerald-500 relative overflow-hidden">
            <TrendingUp className="absolute -right-4 -top-4 w-20 h-20 text-emerald-50 opacity-50" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ganancia Estimada</p>
            <h3 className="text-3xl font-black text-emerald-600">{'$'}{stats.gananciaEstimada.toLocaleString('es-CO')}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-bold">Utilidad libre del club</p>
         </div>
         <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl relative">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cartera Pendiente</p>
            <h3 className="text-3xl font-black text-white">{'$'}{stats.porCobrar.toLocaleString('es-CO')}</h3>
            <div className="flex items-center gap-2 mt-2">
               <div className="w-full bg-slate-800 rounded-full h-1.5">
                 <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${stats.totalVenta > 0 ? (stats.totalAbonado / stats.totalVenta) * 100 : 0}%` }}></div>
               </div>
               <span className="text-[9px] text-slate-400 font-bold">Recaudado</span>
            </div>
         </div>
      </div>

        {/* LISTADO DE PEDIDOS */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
           <div className="p-6 border-b border-slate-100 dark:border-slate-800">
             <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">{t('uniformes.registroPedidos')}</h3>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4 pl-6">{t('uniformes.jugador')}</th>
                      <th className="p-4">{t('uniformes.tallasDorsal')}</th>
                      <th className="p-4">{t('uniformes.finanzas')}</th>
                      <th className="p-4">{t('uniformes.estadoPago')}</th>
                      <th className="p-4">{t('uniformes.fabricacion')}</th>
                      <th className="p-4 text-right pr-6">{t('uniformes.acciones')}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                   {pedidos.length === 0 ? (
                     <tr>
                       <td colSpan={6} className="p-12 text-center text-slate-400 font-medium italic">
                         {t('uniformes.noHayPedidosUniformes')}
                       </td>
                     </tr>
                   ) : pedidos.map(p => {
                     const debe = Number(p.precio_venta) - Number(p.abono);
                     return (
                       <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 pl-6">
                             <p className="font-bold text-slate-900 dark:text-white text-sm">
                               {p.perfiles?.nombres} {p.perfiles?.apellidos}
                             </p>
                             <p className="text-[10px] text-slate-400 uppercase font-bold">{p.perfiles?.grupos || t('uniformes.sinGrupo')}</p>
                          </td>
                          <td className="p-4">
                             <div className="flex flex-wrap gap-2">
                               {p.talla_camisa && <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black rounded-md">👕 {p.talla_camisa}</span>}
                               {p.talla_short && <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black rounded-md">🩳 {p.talla_short}</span>}
                               {p.dorsal && <span className="text-brand text-[10px] font-black rounded-md">#️⃣ {p.dorsal}</span>}
                             </div>
                          </td>
                          <td className="p-4">
                             <div className="text-xs">
                               <p className="font-black text-slate-800 dark:text-white">{t('uniformes.venta')}{Number(p.precio_venta).toLocaleString()}</p>
                               <div className="flex items-center gap-2">
                                 <p className="text-rose-500 font-bold">{t('uniformes.costo')}{Number(p.costo_proveedor).toLocaleString()}</p>
                                 {p.costo_liquidado ? (
                                   <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase">{t('uniformes.liquidado')}</span>
                                 ) : (
                                   <button 
                                     onClick={() => registrarPagoProveedor(p)}
                                     className="text-[8px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black uppercase hover:bg-rose-500 hover:text-white transition-all"
                                     title={t('uniformes.registrarPagoProveedor')}
                                   >
                                     {t('uniformes.pagar')}
                                   </button>
                                 )}
                               </div>
                             </div>
                          </td>
                          <td className="p-4">
                             <div className="flex flex-col gap-1 items-start">
                               <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                 p.estado_pago === 'Pagado' ? 'bg-emerald-100 text-emerald-700' : 
                                 p.estado_pago === 'Abonado' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                               }`}>
                                 {p.estado_pago}
                               </span>
                               {debe > 0 && (
                                 <span className="text-[10px] font-bold text-slate-500">{t('uniformes.debe')}{debe.toLocaleString()}</span>
                               )}
                             </div>
                          </td>
                          <td className="p-4">
                             <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                               p.estado_pedido === 'Entregado' ? 'bg-blue-100 text-blue-700' : 
                               p.estado_pedido === 'En Producción' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                             }`}>
                               {p.estado_pedido}
                             </span>
                          </td>
                          <td className="p-4 text-right pr-6">
                             <div className="flex items-center justify-end gap-2">
                               {debe > 0 && (
                                 <button 
                                   onClick={() => { setPedidoActual(p); setIsAbonoModalOpen(true); }}
                                   className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"
                                   title={t('uniformes.registrarAbono')}
                                 >
                                   <DollarSign className="w-4 h-4" />
                                 </button>
                               )}
                               <button 
                                 onClick={() => abrirModalEditar(p)}
                                 className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-all"
                                 title={t('uniformes.editarPedido')}
                               >
                                 <Scissors className="w-4 h-4" />
                               </button>
                               <button 
                                 onClick={() => eliminarPedido(p.id)}
                                 className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </div>
                          </td>
                       </tr>
                     );
                   })}
                </tbody>
             </table>
           </div>
        </div>

      </div>

      {/* MODAL NUEVO / EDITAR PEDIDO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 px-6 py-5 flex justify-between items-center">
              <h2 className="text-white text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                <Shirt className="w-5 h-5 text-brand" /> 
                {pedidoActual ? t('uniformes.editarPedido') : t('uniformes.nuevoUniforme')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              
              {!pedidoActual && (
                <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('uniformes.buscarJugador')}</label>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder={t('uniformes.escribeNombreJugador')}
                      value={busquedaAlumno}
                      onChange={(e) => setBusquedaAlumno(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand outline-none"
                    />
                  </div>
                  <select 
                    value={jugadorId}
                    onChange={(e) => setJugadorId(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">{t('uniformes.seleccionaAlumno')}</option>
                    {alumnosFiltrados.length > 0 ? (
                      alumnosFiltrados.map(a => (
                        <option key={a.id} value={a.id}>{a.nombres} {a.apellidos}</option>
                      ))
                    ) : (
                      <option disabled>{t('uniformes.noSeEncontraronJugadores')}</option>
                    )}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('uniformes.tallaCamisa')}</label>
                  <input type="text" value={tallaCamisa} onChange={e=>setTallaCamisa(e.target.value)} placeholder={t('uniformes.ejTallas')} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 uppercase" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('uniformes.tallaShort')}</label>
                  <input type="text" value={tallaShort} onChange={e=>setTallaShort(e.target.value)} placeholder={t('uniformes.ejTallas')} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 uppercase" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('uniformes.dorsal')}</label>
                  <input type="text" value={dorsal} onChange={e=>setDorsal(e.target.value)} placeholder={t('uniformes.ej10')} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-black text-brand text-center" />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
                <h4 className="text-xs font-black uppercase text-slate-800 mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" /> {t('uniformes.calculadoraFinanciera')}</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('uniformes.costoDelProveedor')}</label>
                    <input type="number" value={costoProveedor} onChange={e=>setCostoProveedor(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl font-bold text-rose-600 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('uniformes.valorDeVenta')}</label>
                    <input type="number" value={precioVenta} onChange={e=>setPrecioVenta(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl font-black text-slate-800 bg-white" />
                  </div>
                </div>

                {precioVenta && costoProveedor && (
                  <div className="bg-emerald-100 text-emerald-800 text-xs font-bold px-4 py-2 rounded-lg inline-block">
                    {t('uniformes.margenGananciaEstimado')} {'$'}{(Number(precioVenta) - Number(costoProveedor)).toLocaleString()}
                  </div>
                )}

                {!pedidoActual && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('uniformes.abonoInicialPadre')}</label>
                    <input type="number" value={abono} onChange={e=>setAbono(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl font-bold text-emerald-600 bg-white" />
                    <p className="text-[10px] text-slate-500 mt-1 italic">{t('uniformes.siPadreYaPago')}</p>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('uniformes.estadoFabricacion')}</label>
                <select value={estadoPedido} onChange={e=>setEstadoPedido(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 bg-white">
                  <option value="Pendiente">{t('uniformes.pendienteAnotado')}</option>
                  <option value="En Producción">{t('uniformes.enProduccion')}</option>
                  <option value="Entregado">{t('uniformes.entregadoAlumno')}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('uniformes.notasObservaciones')}</label>
                <textarea 
                  value={notas} onChange={e=>setNotas(e.target.value)} rows={3}
                  placeholder={t('uniformes.ejMangaLarga')}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand outline-none resize-none"
                ></textarea>
              </div>

            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={guardarPedido}
                className="w-full bg-brand text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-brand/90 transition-colors shadow-lg shadow-brand/20"
              >
                {t('uniformes.guardarPedido')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ABONO (CUANDO YA EXISTE EL PEDIDO Y QUIEREN PAGAR EL RESTO) */}
      {isAbonoModalOpen && pedidoAbono && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-xl overflow-hidden flex flex-col">
            <div className="bg-emerald-500 p-6 text-center text-white relative overflow-hidden">
              <DollarSign className="w-24 h-24 absolute -right-4 -bottom-4 opacity-20" />
              <h3 className="text-xl font-black uppercase tracking-tighter relative z-10">{t('uniformes.abonarUniforme')}</h3>
              <p className="text-sm font-bold mt-1 opacity-90 relative z-10">{pedidoAbono.perfiles?.nombres} {pedidoAbono.perfiles?.apellidos}</p>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-center text-sm mb-2 border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-500">{t('uniformes.valorTotal')}</span>
                <span className="font-bold text-slate-800">{'$'}{Number(pedidoAbono.precio_venta).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-2 border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-500">{t('uniformes.abonadoHastaHoy')}</span>
                <span className="font-bold text-emerald-600">{'$'}{Number(pedidoAbono.abono || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-6">
                <span className="text-slate-800 font-bold">{t('uniformes.saldoPendiente')}</span>
                <span className="font-black text-rose-500 text-lg">{'$'}{(Number(pedidoAbono.precio_venta) - Number(pedidoAbono.abono || 0)).toLocaleString()}</span>
              </div>

              <div className="mb-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('uniformes.montoPagarHoy')}</label>
                <input 
                  type="number" 
                  value={montoAbonoExtra} 
                  onChange={e => setMontoAbonoExtra(e.target.value)} 
                  className="w-full text-center text-3xl font-black text-emerald-600 border-b-2 border-slate-200 focus:border-emerald-500 outline-none py-2 bg-transparent"
                  placeholder="0"
                />
                <p className="text-[10px] text-center text-slate-400 mt-2 italic">{t('uniformes.esteDineroIngresara')}</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setIsAbonoModalOpen(false); setMontoAbonoExtra(''); }} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors">
                  {t('uniformes.cancelar')}
                </button>
                <button onClick={procesarAbonoExtra} className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all">
                  {t('uniformes.registrarAbono')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
