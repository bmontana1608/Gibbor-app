'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Building2, CreditCard, DollarSign, Settings, 
  RefreshCcw, Activity, Users, Trash2
} from 'lucide-react';

export default function SaaSManagementView() {
  const [cargando, setCargando] = useState(true);
  const [planes, setPlanes] = useState<any[]>([]);
  const [clubes, setClubes] = useState<any[]>([]);
  const [facturacion, setFacturacion] = useState<any[]>([]);
  
  const [planEnEdicion, setPlanEnEdicion] = useState<any>(null);

  useEffect(() => {
    cargarDatosGenerales();
  }, []);

  const cargarDatosGenerales = async () => {
    setCargando(true);
    try {
      const { data: planesData } = await supabase.from('planes_saas').select('*').order('id');
      if (planesData) setPlanes(planesData);

      // Se agrega created_at al select para forzar un nuevo cache key en Next.js
      const { data: clubesData } = await supabase.from('clubes').select('id, nombre, slug, plan_id, estado, proximo_corte, estado_suscripcion, created_at').neq('estado', 'Eliminado').order('nombre');
      if (clubesData) {
        setClubes(clubesData.filter(c => c.estado !== 'Eliminado' && c.estado !== 'eliminado'));
      }

      const fecha = new Date();
      const mes = fecha.getMonth() + 1;
      const anio = fecha.getFullYear();
      
      const { data: facData } = await supabase
        .from('facturacion_mensual')
        .select('*, clubes(nombre, estado)')
        .eq('periodo_mes', mes)
        .eq('periodo_anio', anio);
      
      if (facData) {
        setFacturacion(facData.filter(f => f.clubes?.estado !== 'Eliminado' && f.clubes?.estado !== 'eliminado'));
      }

    } catch (error) {
      console.error("Error cargando panel SaaS:", error);
      toast.error("Error al cargar la información.");
    } finally {
      setCargando(false);
    }
  };

  const guardarPlan = async () => {
    if (!planEnEdicion?.nombre || planEnEdicion?.precio_base === undefined) {
      toast.error("Faltan datos del plan");
      return;
    }

    const toastId = toast.loading("Guardando plan...");
    const payload = {
      id: planEnEdicion.id,
      nombre: planEnEdicion.nombre,
      tipo_cobro: planEnEdicion.tipo_cobro || 'mensual',
      precio_base: planEnEdicion.precio_base,
      limite_jugadores_base: planEnEdicion.limite_jugadores_base || 120,
      precio_jugador_extra: planEnEdicion.precio_jugador_extra || 0,
      precio_por_jugador: planEnEdicion.precio_base || 0, // Fallback para la restricción NOT NULL de la DB
      activo: planEnEdicion.activo ?? true
    };

    try {
      const res = await fetch('/api/admin/planes', {
        method: planEnEdicion.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      
      if (result.error) throw new Error(result.error);
      
      toast.success("Plan actualizado con éxito", { id: toastId });
      setPlanEnEdicion(null);
      cargarDatosGenerales();
    } catch (error: any) {
      toast.error("Error al guardar: " + error.message, { id: toastId });
    }
  };

  const asignarPlanAClub = async (clubId: string, planId: number) => {
    const toastId = toast.loading("Asignando plan...");
    
    try {
      const res = await fetch('/api/admin/clubes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clubId, plan_id: planId })
      });
      const result = await res.json();
      
      if (result.error) throw new Error(result.error);
      
      toast.success("Plan asignado correctamente", { id: toastId });
      setClubes(clubes.map(c => c.id === clubId ? { ...c, plan_id: planId } : c));
    } catch (error: any) {
      toast.error("Error al asignar: " + error.message, { id: toastId });
    }
  };

  const registrarPagoMensual = async (clubId: string) => {
    const toastId = toast.loading("Registrando pago y extendiendo suscripción...");
    try {
      const res = await fetch('/api/admin/suscripciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: clubId, meses: 1 })
      });
      const result = await res.json();
      
      if (result.error) throw new Error(result.error);
      
      toast.success(result.mensaje || "Pago registrado y suscripción extendida", { id: toastId });
      cargarDatosGenerales();
    } catch (error: any) {
      toast.error("Error al registrar pago: " + error.message, { id: toastId });
    }
  };

  const ejecutarFacturacionEdgeFunction = async () => {
    const toastId = toast.loading("Calculando facturación mensual...");
    try {
      const { data, error } = await supabase.functions.invoke('facturacion-mensual');
      if (error) throw error;
      
      toast.success("Facturación generada correctamente", { id: toastId });
      cargarDatosGenerales();
    } catch (error: any) {
      toast.error("Error en facturación: " + error.message, { id: toastId });
    }
  };

  const eliminarPlan = async (plan: any) => {
    const estaEnUso = clubes.some(c => c.plan_id === plan.id);
    if (estaEnUso) {
      toast.error("No se puede eliminar un plan que tiene clubes vinculados. Cambia el plan de los clubes antes de borrarlo.", { duration: 5000 });
      return;
    }

    const confirmar = window.confirm(`¿ESTÁS SEGURO? Esta acción ELIMINARÁ el esquema "${plan.nombre}". Esta acción no se puede deshacer.`);
    if (!confirmar) return;

    const toastId = toast.loading("Eliminando plan...");
    
    try {
      const res = await fetch(`/api/admin/planes?id=${plan.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      toast.success("Plan eliminado correctamente", { id: toastId });
      cargarDatosGenerales();
    } catch (error: any) {
      toast.error("Error al eliminar: " + error.message, { id: toastId });
    }
  };

  const marcarFacturaPagada = async (facturaId: string) => {
    const confirmar = window.confirm('¿Confirmas que el club ha pagado este corte mensual? Esto reactivará sus servicios si estaban suspendidos.');
    if (!confirmar) return;

    const toastId = toast.loading('Actualizando estado de pago...');
    const { error } = await supabase
      .from('facturacion_mensual')
      .update({ estado_pago: 'pagado' })
      .eq('id', facturaId);

    if (error) {
      toast.error('Error al registrar pago: ' + error.message, { id: toastId });
    } else {
      toast.success('Pago registrado correctamente', { id: toastId });
      cargarDatosGenerales();
    }
  };

  const formatearDinero = (monto: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(monto);
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-lime-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Header integrado en el flujo */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-2 bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent">SaaS <span className="text-lime-500">Manager</span></h2>
          <p className="text-gray-500 text-sm font-medium">Control maestro de suscripciones y facturación multiclub.</p>
        </div>
        <button 
          onClick={ejecutarFacturacionEdgeFunction} 
          className="bg-lime-500 hover:bg-lime-400 text-white px-8 py-5 rounded-2xl font-black flex items-center gap-3 transition-all shadow-lg shadow-lime-200 hover:-translate-y-1 active:scale-95 uppercase italic tracking-tighter text-xs"
        >
          <Activity className="w-5 h-5 text-white" />
          Calcular Corte Mensual
        </button>
      </header>

      <div className="space-y-8">
        
        {/* SECCIÓN SUPERIOR: GESTIÓN DE PLANES */}
        <div className="bg-white rounded-[3rem] border border-gray-200 p-8 shadow-sm relative">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 border-b border-gray-100 pb-6">
            <div>
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" /> Planes de Suscripción SaaS
              </h2>
              <p className="text-sm text-gray-500 mt-1">Configura las tarifas y límites de jugadores para tus academias.</p>
            </div>
            <button 
              onClick={() => setPlanEnEdicion({ nombre: '', tipo_cobro: 'mensual', precio_base: 0, limite_jugadores_base: 120, precio_jugador_extra: 2000, activo: true })}
              className="bg-lime-500 hover:bg-lime-400 text-white font-bold py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-lime-200 hover:-translate-y-1 active:scale-95 text-sm"
            >
              <CreditCard size={18} /> Crear Nuevo Plan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {planes.map(plan => (
              <div key={plan.id} className={`bg-white rounded-3xl border ${plan.activo ? 'border-gray-200 hover:border-lime-300' : 'border-red-100 bg-red-50/30'} p-6 shadow-sm relative transition-all group`}>
                {!plan.activo && <div className="absolute top-4 right-4 text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded-md">Inactivo</div>}
                <div className="text-xs font-black text-lime-700 bg-lime-100 w-max px-3 py-1 rounded-lg uppercase tracking-widest mb-4">
                  {plan.tipo_cobro}
                </div>
                <h3 className="font-black text-xl text-slate-800 mb-2">{plan.nombre}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-slate-800 tracking-tighter italic">{formatearDinero(plan.precio_base)}</span>
                  <span className="text-xs font-bold text-gray-400 uppercase">/ {plan.tipo_cobro === 'anual' ? 'año' : 'mes'}</span>
                </div>
                
                <ul className="space-y-3 text-sm text-gray-600 mb-8 border-t border-gray-100 pt-4">
                  <li className="flex justify-between items-center">
                    <span className="text-gray-500">Límite base:</span> 
                    <strong className="font-black">{plan.limite_jugadores_base === 0 ? 'Ilimitado' : `${plan.limite_jugadores_base} jug.`}</strong>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-gray-500">Jugador extra:</span> 
                    <strong className="font-black">{formatearDinero(plan.precio_jugador_extra)}</strong>
                  </li>
                </ul>
                
                <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setPlanEnEdicion({
                      ...plan, 
                      precio_base: plan.precio_base ?? 0,
                      limite_jugadores_base: plan.limite_jugadores_base ?? 120,
                      precio_jugador_extra: plan.precio_jugador_extra ?? 0
                    })}
                    className="flex-1 border border-gray-200 hover:border-lime-500 hover:text-lime-600 text-gray-600 font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 bg-gray-50 hover:bg-lime-50"
                  >
                    <Settings className="w-4 h-4" /> Editar
                  </button>
                  <button 
                    onClick={() => eliminarPlan(plan)}
                    className="px-4 border border-gray-200 hover:border-red-500 hover:text-red-600 text-gray-400 font-bold py-2.5 rounded-xl transition-colors bg-gray-50 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal de Edición de Plan */}
        {planEnEdicion && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in">
            <div className="bg-white rounded-[2rem] max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 md:p-8">
                <h4 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-lime-500" />
                  {planEnEdicion.id ? 'Editando Plan Existente' : 'Nuevo Esquema de Cobro'}
                </h4>
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Nombre del Esquema</label>
                    <input 
                      type="text" 
                      value={planEnEdicion.nombre} 
                      onChange={(e) => setPlanEnEdicion({...planEnEdicion, nombre: e.target.value})} 
                      className="w-full bg-gray-50 border border-gray-200 text-slate-800 rounded-2xl px-4 py-3.5 outline-none focus:border-lime-500 focus:bg-white font-bold transition-colors"
                      placeholder="Ej: Plan Crecimiento"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Tipo Cobro</label>
                      <select 
                        value={planEnEdicion.tipo_cobro || 'mensual'} 
                        onChange={(e) => setPlanEnEdicion({...planEnEdicion, tipo_cobro: e.target.value})} 
                        className="w-full bg-gray-50 border border-gray-200 text-slate-800 rounded-2xl px-4 py-3.5 outline-none focus:border-lime-500 focus:bg-white font-bold transition-colors"
                      >
                        <option value="mensual">Mensual</option>
                        <option value="anual">Anual</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Precio Base (COP)</label>
                      <input 
                        type="number" 
                        value={planEnEdicion.precio_base ?? 0} 
                        onChange={(e) => setPlanEnEdicion({...planEnEdicion, precio_base: Number(e.target.value)})} 
                        className="w-full bg-gray-50 border border-gray-200 text-emerald-600 rounded-2xl px-4 py-3.5 outline-none focus:border-emerald-500 focus:bg-white font-black transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Límite Base de Jugadores</label>
                      <input 
                        type="number" 
                        value={planEnEdicion.limite_jugadores_base ?? 120} 
                        onChange={(e) => setPlanEnEdicion({...planEnEdicion, limite_jugadores_base: Number(e.target.value)})} 
                        className="w-full bg-gray-50 border border-gray-200 text-slate-800 rounded-2xl px-4 py-3.5 outline-none focus:border-lime-500 focus:bg-white font-black transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Costo Jugador Extra (COP)</label>
                      <input 
                        type="number" 
                        value={planEnEdicion.precio_jugador_extra ?? 0} 
                        onChange={(e) => setPlanEnEdicion({...planEnEdicion, precio_jugador_extra: Number(e.target.value)})} 
                        className="w-full bg-gray-50 border border-gray-200 text-emerald-600 rounded-2xl px-4 py-3.5 outline-none focus:border-emerald-500 focus:bg-white font-black transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-2 p-4 bg-lime-50/50 rounded-2xl border border-lime-100">
                    <input type="checkbox" id="planActivo" checked={planEnEdicion.activo !== false} onChange={e => setPlanEnEdicion({...planEnEdicion, activo: e.target.checked})} className="w-5 h-5 accent-lime-500" />
                    <label htmlFor="planActivo" className="text-sm font-bold text-lime-900 cursor-pointer">Plan Activo y Visible</label>
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-gray-100 mt-4">
                    <button 
                      onClick={() => setPlanEnEdicion(null)} 
                      className="flex-1 px-4 py-4 rounded-2xl font-black uppercase text-xs tracking-widest border border-gray-200 text-gray-500 hover:text-slate-800 hover:bg-gray-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={guardarPlan} 
                      className="flex-1 px-4 py-4 rounded-2xl font-black uppercase text-xs tracking-widest bg-lime-500 text-white hover:bg-lime-400 transition-all shadow-lg shadow-lime-200"
                    >
                      Guardar Plan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PANELES INFERIORES: ASIGNACIÓN Y FACTURACIÓN */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Lista de Clubes y Asignación */}
          <div className="bg-white rounded-[3rem] border border-gray-200 p-8 shadow-sm relative lg:col-span-2">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2 border-b border-gray-100 pb-6">
              <Building2 className="w-4 h-4 text-lime-500" /> Panel de Control de Suscripciones
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="py-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest rounded-tl-xl">Academia Nodo</th>
                    <th className="py-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Plan Asignado</th>
                    <th className="py-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Estado</th>
                    <th className="py-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Próximo Corte</th>
                    <th className="py-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right rounded-tr-xl">Acción de Cobro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clubes.map(club => {
                    const isVencido = club.proximo_corte ? new Date(club.proximo_corte) < new Date() : true;
                    return (
                      <tr key={club.id} className="group hover:bg-gray-50 transition-colors">
                        <td className="py-5 px-4">
                          <p className="font-black text-slate-800 uppercase italic tracking-tighter text-sm">{club.nombre}</p>
                          <p className="font-mono text-[10px] text-lime-600">/{club.slug}</p>
                        </td>
                        <td className="py-5 px-4">
                          <select 
                            value={club.plan_id || ''} 
                            onChange={(e) => asignarPlanAClub(club.id, Number(e.target.value))}
                            className="bg-white border border-gray-200 text-slate-700 font-bold text-[10px] uppercase rounded-lg px-2 py-2 outline-none focus:border-lime-500 cursor-pointer w-32 transition-colors"
                          >
                            <option value="" disabled>Plan...</option>
                            {planes.map(p => (
                              <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex flex-col gap-1">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border w-max ${
                              club.estado === 'Activo' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                            }`}>
                              {club.estado}
                            </span>
                            {club.estado_suscripcion && (
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{club.estado_suscripcion}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          <span className={`text-[11px] font-black px-2 py-1 rounded-md border w-max flex items-center gap-1 ${
                            isVencido ? 'bg-red-50 text-red-600 border-red-200' : 'bg-lime-50 text-lime-700 border-lime-200'
                          }`}>
                            {club.proximo_corte || 'No Definido'}
                          </span>
                        </td>
                        <td className="py-5 px-4 text-right">
                          <button 
                            onClick={() => registrarPagoMensual(club.id)}
                            className="bg-slate-800 hover:bg-lime-500 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all uppercase tracking-widest shadow-sm hover:shadow-lime-200"
                          >
                            Registrar Pago (1 Mes)
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen de Facturación del Mes */}
          <div className="bg-white rounded-[3rem] border border-gray-200 p-8 shadow-sm relative">
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" /> Proyección Mes Actual
              </h2>
              <div className="flex items-center gap-2 text-[10px] font-black text-lime-600 uppercase tracking-widest bg-lime-50 px-4 py-2 rounded-xl border border-lime-200">
                <RefreshCcw className="w-3 h-3" /> Estado Live
              </div>
            </div>

            {facturacion.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <Activity className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                <p className="text-sm font-bold text-gray-500">Aún no hay cálculos de facturación para este mes.</p>
                <p className="text-xs text-gray-400 mt-2">Usa el botón superior para ejecutar la función serverless de corte.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {facturacion.map(fac => (
                  <div key={fac.id} className="p-6 bg-white rounded-3xl border border-gray-200 hover:border-lime-300 transition-colors flex flex-col gap-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{fac.clubes?.nombre}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                        fac.estado_pago === 'pagado' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                        'bg-yellow-50 text-yellow-600 border-yellow-200'
                      }`}>
                        {fac.estado_pago}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-3xl font-black text-slate-800 tracking-tighter italic">{formatearDinero(fac.total_pagar)}</p>
                        {fac.estado_pago !== 'pagado' && (
                          <button 
                            onClick={() => marcarFacturaPagada(fac.id)}
                            className="bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                          >
                            Marcar Pagado
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                         <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                            <Users className="w-3 h-3 text-lime-500" /> 
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{fac.cantidad_jugadores} Atletas</span>
                         </div>
                         <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                            <DollarSign className="w-3 h-3 text-emerald-500" /> 
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Base: {formatearDinero(fac.tarifa_aplicada)}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
