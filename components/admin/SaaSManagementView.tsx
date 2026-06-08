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

      const { data: clubesData } = await supabase.from('clubes').select('id, nombre, slug, plan_id, estado').order('nombre');
      if (clubesData) {
        // Doble validación para evitar clubs que estén eliminados incluso si la caché falla
        setClubes(clubesData.filter(c => c.estado !== 'Eliminado' && c.estado !== 'eliminado'));
      }

      const fecha = new Date();
      const mes = fecha.getMonth() + 1;
      const anio = fecha.getFullYear();
      
      const { data: facData } = await supabase
        .from('facturacion_mensual')
        .select('*, clubes(nombre)')
        .eq('periodo_mes', mes)
        .eq('periodo_anio', anio);
      
      if (facData) setFacturacion(facData);

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
    const { error } = await supabase.from('planes_saas').upsert({
      id: planEnEdicion.id,
      nombre: planEnEdicion.nombre,
      tipo_cobro: planEnEdicion.tipo_cobro || 'mensual',
      precio_base: planEnEdicion.precio_base,
      limite_jugadores_base: planEnEdicion.limite_jugadores_base || 120,
      precio_jugador_extra: planEnEdicion.precio_jugador_extra || 0,
      activo: planEnEdicion.activo ?? true
    });

    if (error) {
      toast.error("Error al guardar: " + error.message, { id: toastId });
    } else {
      toast.success("Plan actualizado con éxito", { id: toastId });
      setPlanEnEdicion(null);
      cargarDatosGenerales();
    }
  };

  const asignarPlanAClub = async (clubId: string, planId: number) => {
    const toastId = toast.loading("Asignando plan...");
    const { error } = await supabase.from('clubes').update({ plan_id: planId }).eq('id', clubId);
    
    if (error) {
      toast.error("Error al asignar: " + error.message, { id: toastId });
    } else {
      toast.success("Plan asignado correctamente", { id: toastId });
      setClubes(clubes.map(c => c.id === clubId ? { ...c, plan_id: planId } : c));
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
    const { error } = await supabase.from('planes_saas').delete().eq('id', plan.id);

    if (error) {
      toast.error("Error al eliminar: " + error.message, { id: toastId });
    } else {
      toast.success("Plan eliminado correctamente", { id: toastId });
      cargarDatosGenerales();
    }
  };

  const marcarFacturaPagada = async (facturaId: string) => {
    const confirmar = window.confirm('¿Confirmas que el club ha pagado este corte mensual? Esto reactivará sus servicios si estaban suspendidos.');
    if (!confirmar) return;

    const toastId = toast.loading('Actualizando estado de pago...');
    const { error } = await supabase
      .from('facturacion_mensual')
      .update({ estado_pago: 'pagado', fecha_pago: new Date().toISOString() })
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL IZQUIERDO: GESTIÓN DE PLANES */}
        <div className="space-y-8">
          <div className="bg-white rounded-[3rem] border border-gray-200 p-8 shadow-sm relative">
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" /> Esquemas Base
              </h2>
              <button 
                onClick={() => setPlanEnEdicion({ nombre: '', precio_por_jugador: 2000, moneda: 'COP' })}
                className="text-[10px] font-black text-lime-600 uppercase tracking-widest bg-lime-50 px-4 py-2 rounded-xl hover:bg-lime-100 border border-lime-200 transition-all"
              >
                + Crear Plan
              </button>
            </div>

            <div className="space-y-4">
              {planes.map(plan => (
                <div key={plan.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-gray-200 transition-all">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-800 uppercase italic tracking-tighter text-sm">{plan.nombre}</h3>
                      <span className="bg-lime-100 text-lime-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">{plan.tipo_cobro}</span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 mt-1">Base: {formatearDinero(plan.precio_base)} | Extra: {formatearDinero(plan.precio_jugador_extra)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPlanEnEdicion({
                        ...plan, 
                        precio_base: plan.precio_base ?? 0,
                        limite_jugadores_base: plan.limite_jugadores_base ?? 120,
                        precio_jugador_extra: plan.precio_jugador_extra ?? 0
                      })}
                      className="text-gray-400 hover:text-lime-600 p-2 transition-colors bg-white rounded-xl border border-gray-200"
                      title="Editar Plan"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => eliminarPlan(plan)}
                      className="text-gray-400 hover:text-red-500 p-2 transition-colors bg-white rounded-xl border border-gray-200 hover:border-red-200"
                      title="Eliminar Plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Formulario de Edición de Plan */}
            {planEnEdicion && (
              <div className="mt-8 p-6 bg-gray-50 rounded-3xl border border-gray-200 animate-in fade-in zoom-in-95 shadow-lg">
                <h4 className="text-[10px] font-black text-lime-600 uppercase tracking-widest mb-6">
                  {planEnEdicion.id ? 'Editando Plan Existente' : 'Nuevo Esquema de Cobro'}
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1 block">Nombre del Esquema</label>
                    <input 
                      type="text" 
                      value={planEnEdicion.nombre} 
                      onChange={(e) => setPlanEnEdicion({...planEnEdicion, nombre: e.target.value})} 
                      className="w-full bg-white border border-gray-200 text-slate-800 rounded-2xl px-4 py-3 outline-none focus:border-lime-500 font-bold text-sm transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1 block">Tipo Cobro</label>
                      <select 
                        value={planEnEdicion.tipo_cobro || 'mensual'} 
                        onChange={(e) => setPlanEnEdicion({...planEnEdicion, tipo_cobro: e.target.value})} 
                        className="w-full bg-white border border-gray-200 text-slate-800 rounded-2xl px-4 py-3 outline-none focus:border-lime-500 font-bold text-sm transition-colors"
                      >
                        <option value="mensual">Mensual</option>
                        <option value="anual">Anual</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1 block">Precio Base (COP)</label>
                      <input 
                        type="number" 
                        value={planEnEdicion.precio_base ?? 0} 
                        onChange={(e) => setPlanEnEdicion({...planEnEdicion, precio_base: Number(e.target.value)})} 
                        className="w-full bg-white border border-gray-200 text-emerald-600 rounded-2xl px-4 py-3 outline-none focus:border-lime-500 font-black transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1 block">Límite Base</label>
                      <input 
                        type="number" 
                        value={planEnEdicion.limite_jugadores_base ?? 120} 
                        onChange={(e) => setPlanEnEdicion({...planEnEdicion, limite_jugadores_base: Number(e.target.value)})} 
                        className="w-full bg-white border border-gray-200 text-slate-800 rounded-2xl px-4 py-3 outline-none focus:border-lime-500 font-black transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1 block">Costo Extra (COP)</label>
                      <input 
                        type="number" 
                        value={planEnEdicion.precio_jugador_extra ?? 0} 
                        onChange={(e) => setPlanEnEdicion({...planEnEdicion, precio_jugador_extra: Number(e.target.value)})} 
                        className="w-full bg-white border border-gray-200 text-emerald-600 rounded-2xl px-4 py-3 outline-none focus:border-lime-500 font-black transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4 px-2">
                    <input type="checkbox" id="planActivo" checked={planEnEdicion.activo !== false} onChange={e => setPlanEnEdicion({...planEnEdicion, activo: e.target.checked})} className="w-4 h-4 accent-lime-500" />
                    <label htmlFor="planActivo" className="text-xs font-bold text-gray-700 cursor-pointer">Plan Activo</label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setPlanEnEdicion(null)} 
                      className="flex-1 px-4 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-gray-200 text-gray-500 hover:text-slate-800 hover:bg-gray-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={guardarPlan} 
                      className="flex-1 px-4 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all shadow-md"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: ASIGNACIÓN Y ESTADO */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Lista de Clubes y Asignación */}
          <div className="bg-white rounded-[3rem] border border-gray-200 p-8 shadow-sm relative">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2 border-b border-gray-100 pb-6">
              <Building2 className="w-4 h-4 text-lime-500" /> Asignación de Contratos
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Academia Nodo</th>
                    <th className="pb-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Subdominio</th>
                    <th className="pb-4 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Plan Asignado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clubes.map(club => (
                    <tr key={club.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="py-5 px-4 font-black text-slate-800 uppercase italic tracking-tighter text-sm">{club.nombre}</td>
                      <td className="py-5 px-4 font-mono text-xs text-lime-600">/{club.slug}</td>
                      <td className="py-5 px-4 text-right">
                        <select 
                          value={club.plan_id || ''} 
                          onChange={(e) => asignarPlanAClub(club.id, Number(e.target.value))}
                          className="bg-white border border-gray-200 text-slate-700 font-bold text-xs rounded-xl px-4 py-3 outline-none focus:border-lime-500 cursor-pointer w-48 transition-colors"
                        >
                          <option value="" disabled>Seleccionar Plan...</option>
                          {planes.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} ({formatearDinero(p.precio_por_jugador)})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
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
