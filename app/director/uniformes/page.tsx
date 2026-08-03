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

export default function UniformesModule() {
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
      toast.error("Error cargando los datos");
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
      return toast.error("Jugador y Precio de Venta son obligatorios");
    }

    const toastId = toast.loading("Guardando pedido...");
    
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
      
      toast.success("Pedido guardado con éxito", { id: toastId });
      setIsModalOpen(false);
      cargarDatos();
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message, { id: toastId });
    }
  };

  const registrarPagoProveedor = async (pedido: any) => {
    if (pedido.costo_liquidado) return toast.info("Este costo ya fue liquidado.");
    if (!window.confirm(`¿Deseas registrar el pago de $${Number(pedido.costo_proveedor).toLocaleString()} al proveedor como un EGRESO del club?`)) return;

    const toastId = toast.loading("Registrando egreso...");
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

      toast.success("Gasto registrado en la contabilidad general del club", { id: toastId });
      cargarDatos();
    } catch (err: any) {
      toast.error("Error al liquidar: " + err.message, { id: toastId });
    }
  };

  const eliminarPedido = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este pedido?")) return;
    const toastId = toast.loading("Eliminando...");
    try {
      const { error } = await supabase.from('pedidos_uniformes').delete().eq('id', id);
      if (error) throw error;
      toast.success("Eliminado correctamente", { id: toastId });
      cargarDatos();
    } catch (err: any) {
      toast.error("Error: " + err.message, { id: toastId });
    }
  };

  // NOTA DE DISEÑO: Los uniformes tienen su propio "bolsillo" financiero (pedidos_uniformes).
  // NO se inyectan en pagos_ingresos para mantener el historial de mensualidades limpio.
  // El dashboard de uniformes ya muestra cartera, abonos y ganancias de forma independiente.
  const registrarIngresoFinanciero = async (_jId: string, _monto: number, _nota: string) => {
    // Intencionalmente desactivado: ver comentario arriba.
  };

  const registrarNuevoAbono = async () => {
    if (!pedidoActual || !nuevoAbonoMonto) return;
    const montoSumar = Number(nuevoAbonoMonto);
    if (montoSumar <= 0) return toast.error("El abono debe ser mayor a 0");

    const toastId = toast.loading("Procesando pago...");
    
    const nuevoTotalAbono = Number(pedidoActual.abono || 0) + montoSumar;
    const precioVent = Number(pedidoActual.precio_venta || 0);
    const estadoPago = nuevoTotalAbono >= precioVent ? 'Pagado' : 'Abonado';

    try {
      // 1. Actualizar el pedido
      const { error } = await supabase
        .from('pedidos_uniformes')
        .update({ 
          abono: nuevoTotalAbono, 
          estado_pago: estadoPago 
        })
        .eq('id', pedidoActual.id);
        
      if (error) throw error;

      // 2. Inyectar a ingresos generales
      await registrarIngresoFinanciero(pedidoActual.jugador_id, montoSumar, `Abono de $${montoSumar}`);

      toast.success(`Abono registrado exitosamente. Se ha inyectado $${montoSumar} a los ingresos del club.`, { id: toastId });
      setIsModalAbonoOpen(false);
      setNuevoAbonoMonto('');
      cargarDatos();
    } catch (err: any) {
      toast.error("Error al registrar abono: " + err.message, { id: toastId });
    }
  };

  if (cargando && !tenant) {
    return <div className="p-8 text-center text-slate-500 font-bold">Cargando módulo de uniformes...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-3">
               <Shirt className="text-brand" /> Dotación y Uniformes
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Controla pedidos, tallas, costos de proveedor y tus ganancias.
            </p>
          </div>
          <button 
            onClick={abrirModalNuevo}
            className="bg-slate-900 text-white hover:bg-slate-800 px-6 py-3 rounded-2xl font-black text-sm uppercase flex items-center gap-2 transition-all shadow-xl shadow-slate-900/10"
          >
            <PlusCircle className="w-5 h-5" /> Nuevo Pedido
          </button>
        </div>

        {/* DASHBOARD INTELIGENTE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           <div className="text-brand">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ingreso Proyectado</p>
              <h3 className="text-3xl font-black text-slate-800 dark:text-white">${stats.totalVenta.toLocaleString('es-CO')}</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-bold">Valor de cobro total</p>
           </div>
           <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-rose-500">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Costo Proveedor</p>
              <h3 className="text-3xl font-black text-rose-600">${stats.totalCosto.toLocaleString('es-CO')}</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-bold">Gastos de fabricación</p>
           </div>
           <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-emerald-500 relative overflow-hidden">
              <TrendingUp className="absolute -right-4 -top-4 w-20 h-20 text-emerald-50 opacity-50" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ganancia Estimada</p>
              <h3 className="text-3xl font-black text-emerald-600">${stats.gananciaEstimada.toLocaleString('es-CO')}</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-bold">Utilidad libre del club</p>
           </div>
           <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl relative">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cartera Pendiente</p>
              <h3 className="text-3xl font-black text-white">${stats.porCobrar.toLocaleString('es-CO')}</h3>
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
             <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">Registro de Pedidos</h3>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4 pl-6">Jugador</th>
                      <th className="p-4">Tallas & Dorsal</th>
                      <th className="p-4">Finanzas</th>
                      <th className="p-4">Estado Pago</th>
                      <th className="p-4">Fabricación</th>
                      <th className="p-4 text-right pr-6">Acciones</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                   {pedidos.length === 0 ? (
                     <tr>
                       <td colSpan={6} className="p-12 text-center text-slate-400 font-medium italic">
                         No hay pedidos de uniformes registrados.
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
                             <p className="text-[10px] text-slate-400 uppercase font-bold">{p.perfiles?.grupos || 'Sin grupo'}</p>
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
                               <p className="font-black text-slate-800 dark:text-white">Venta: ${Number(p.precio_venta).toLocaleString()}</p>
                               <div className="flex items-center gap-2">
                                 <p className="text-rose-500 font-bold">Costo: ${Number(p.costo_proveedor).toLocaleString()}</p>
                                 {p.costo_liquidado ? (
                                   <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase">Liquidado</span>
                                 ) : (
                                   <button 
                                     onClick={() => registrarPagoProveedor(p)}
                                     className="text-[8px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black uppercase hover:bg-rose-500 hover:text-white transition-all"
                                     title="Registrar pago al proveedor"
                                   >
                                     Pagar
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
                                 <span className="text-[10px] font-bold text-slate-500">Debe: ${debe.toLocaleString()}</span>
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
                                   onClick={() => { setPedidoActual(p); setIsModalAbonoOpen(true); }}
                                   className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"
                                   title="Registrar Abono"
                                 >
                                   <DollarSign className="w-4 h-4" />
                                 </button>
                               )}
                               <button 
                                 onClick={() => abrirModalEditar(p)}
                                 className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-all"
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

      {/* MODAL CREAR/EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-[2rem]">
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-xl">
                {pedidoActual ? 'Editar Pedido' : 'Nuevo Uniforme'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-800 bg-white rounded-full shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Buscar Jugador</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text"
                    placeholder="Escribe el nombre del jugador..."
                    value={busquedaJugador}
                    onChange={(e) => setBusquedaJugador(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                
                <select 
                  value={jugadorId} 
                  onChange={(e) => setJugadorId(e.target.value)}
                  disabled={!!pedidoActual}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 mt-2"
                >
                  <option value="">Selecciona un alumno...</option>
                  {jugadores
                    .filter(j => 
                      `${j.nombres} ${j.apellidos}`.toLowerCase().includes(busquedaJugador.toLowerCase())
                    )
                    .map(j => (
                      <option key={j.id} value={j.id}>{j.nombres} {j.apellidos} ({j.grupos || 'Sin grupo'})</option>
                    ))
                  }
                </select>
                {busquedaJugador && jugadores.filter(j => `${j.nombres} ${j.apellidos}`.toLowerCase().includes(busquedaJugador.toLowerCase())).length === 0 && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1">No se encontraron jugadores con ese nombre.</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Talla Camisa</label>
                  <input type="text" value={tallaCamisa} onChange={(e) => setTallaCamisa(e.target.value)} placeholder="Ej: M, 12, S" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none uppercase" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Talla Short</label>
                  <input type="text" value={tallaShort} onChange={(e) => setTallaShort(e.target.value)} placeholder="Ej: M, 12, S" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none uppercase" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dorsal (#)</label>
                  <input type="text" value={dorsal} onChange={(e) => setDorsal(e.target.value)} placeholder="Ej: 10" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-slate-700 dark:text-slate-200 outline-none" />
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Calculadora Financiera
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Costo del Proveedor ($)</label>
                    <input type="number" value={costoProveedor} onChange={(e) => setCostoProveedor(e.target.value)} placeholder="0" className="w-full p-4 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl font-black text-rose-600 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor de Venta (Cobro) ($)</label>
                    <input type="number" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} placeholder="0" className="text-brand outline-none" />
                  </div>
                </div>
                {Number(precioVenta) > 0 && (
                  <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margen de Ganancia Estimado:</span>
                    <span className="text-lg font-black text-emerald-500">
                      \${(Number(precioVenta) - Number(costoProveedor)).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {!pedidoActual && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Abono Inicial del Padre ($)</label>
                  <input type="number" value={abono} onChange={(e) => setAbono(e.target.value)} placeholder="0" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-slate-700 outline-none" />
                  <p className="text-[10px] text-slate-400 font-medium italic mt-1">
                    * Si el padre ya pagó algo, ingrésalo aquí. Esto se sumará a los ingresos generales del club.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado de Fabricación</label>
                <select 
                  value={estadoPedido} 
                  onChange={(e) => setEstadoPedido(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-700 outline-none"
                >
                  <option value="Pendiente">Pendiente (Anotado)</option>
                  <option value="En Producción">En Producción (Pedido al proveedor)</option>
                  <option value="Entregado">Entregado al Alumno</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas / Observaciones</label>
                <textarea 
                  value={notas} 
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: Manga larga, nombre personalizado..."
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-700 outline-none h-24 resize-none"
                ></textarea>
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-[2rem]">
              <button 
                onClick={guardarPedido}
                className="w-full bg-slate-900 dark:bg-brand text-white hover:scale-[1.02] transition-all px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20"
              >
                <CheckCircle className="w-5 h-5" /> Guardar Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR ABONO */}
      {isModalAbonoOpen && pedidoActual && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl p-6 animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-lg">Abonar a Uniforme</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase">{pedidoActual.perfiles?.nombres}</p>
                 </div>
                 <button onClick={() => setIsModalAbonoOpen(false)} className="text-slate-400 hover:text-slate-800"><X className="w-5 h-5" /></button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 mb-6">
                 <div className="flex justify-between mb-2 text-xs">
                    <span className="font-bold text-slate-500">Valor Total:</span>
                    <span className="font-black text-slate-800 dark:text-white">\${Number(pedidoActual.precio_venta).toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between mb-2 text-xs">
                    <span className="font-bold text-slate-500">Abonado hasta hoy:</span>
                    <span className="font-black text-emerald-600">\${Number(pedidoActual.abono).toLocaleString()}</span>
                 </div>
                 <div className="w-full h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                 <div className="flex justify-between text-sm">
                    <span className="font-black text-rose-500 uppercase tracking-widest">Saldo Pendiente:</span>
                    <span className="font-black text-rose-600">\${(Number(pedidoActual.precio_venta) - Number(pedidoActual.abono)).toLocaleString()}</span>
                 </div>
              </div>

              <div className="space-y-2 mb-6">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto a Pagar Hoy ($)</label>
                 <input 
                   type="number" 
                   value={nuevoAbonoMonto} 
                   onChange={(e) => setNuevoAbonoMonto(e.target.value)}
                   placeholder="0"
                   className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-xl text-emerald-600 outline-none text-center"
                 />
                 <p className="text-[9px] text-slate-400 text-center italic mt-2">
                   Este dinero ingresará inmediatamente a la caja general del club.
                 </p>
              </div>

              <button 
                onClick={registrarNuevoAbono}
                className="w-full bg-emerald-500 text-white hover:bg-emerald-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <CreditCard className="w-5 h-5" /> Registrar Pago
              </button>
           </div>
        </div>
      )}

    </div>
  );
}
