'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  ArrowLeft, Users as UsersIcon, AlertTriangle, Search, 
  Shield, TrendingUp, DollarSign, Clock, CheckCircle, Edit3, Plus, Tag 
} from 'lucide-react';
import { useTenant } from '@/lib/hooks/useTenant';

export default function GestionDePlanes() {
  const router = useRouter();
  const { slug: tenantSlug } = useTenant();
  const [tenant, setTenant] = useState<any>(null);

  const [jugadores, setJugadores] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [conceptos, setConceptos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [tabActivo, setTabActivo] = useState('planes'); // 'planes' | 'conceptos'

  // Estados para Edición/Creación de Planes
  const [isModalPlanOpen, setIsModalPlanOpen] = useState(false);
  const [planEditando, setPlanEditando] = useState<any>(null);
  const [nombrePlanEdit, setNombrePlanEdit] = useState('');
  const [montoPlanEdit, setMontoPlanEdit] = useState('');
  const [descuentoPlanEdit, setDescuentoPlanEdit] = useState('');
  const [diaCobroPlanEdit, setDiaCobroPlanEdit] = useState('');
  const [graciaPlanEdit, setGraciaPlanEdit] = useState('');

  // Estados para Edición/Creación de Conceptos
  const [isModalConceptoOpen, setIsModalConceptoOpen] = useState(false);
  const [conceptoEditando, setConceptoEditando] = useState<any>(null);
  const [nombreConceptoEdit, setNombreConceptoEdit] = useState('');
  const [montoConceptoEdit, setMontoConceptoEdit] = useState('');

  useEffect(() => {
    cargarDatos();
  }, [tenantSlug]);

  async function cargarDatos() {
    setCargando(true);
    let currentTenant = tenant;

    if (!currentTenant && tenantSlug) {
      try {
        const tenantRes = await fetch(`/api/tenant?slug=${tenantSlug}`);
        currentTenant = await tenantRes.json();
        setTenant(currentTenant);
      } catch (err) {
        console.error("Error al cargar tenant", err);
      }
    }

    const { data: perfilesData } = await supabase
      .from('perfiles')
      .select('id, nombres, apellidos, tipo_plan')
      .neq('rol', 'Entrenador')
      .order('nombres', { ascending: true });

    const { data: planesData } = await supabase
      .from('planes')
      .select('*')
      .order('nombre', { ascending: true });

    const { data: conceptosData } = await supabase
      .from('conceptos_cobro')
      .select('*')
      .order('nombre', { ascending: true });

    if (perfilesData) setJugadores(perfilesData);
    if (planesData) setPlanes(planesData);
    if (conceptosData) setConceptos(conceptosData);
    setCargando(false);
  }

  // --- PLANES LOGIC ---
  const handleCreatePlan = () => {
    setPlanEditando(null);
    setNombrePlanEdit('');
    setMontoPlanEdit('');
    setDescuentoPlanEdit('0');
    setDiaCobroPlanEdit('1');
    setGraciaPlanEdit('5');
    setIsModalPlanOpen(true);
  };

  const handleEditPlan = (plan: any) => {
    setPlanEditando(plan);
    setNombrePlanEdit(plan.nombre);
    setMontoPlanEdit(plan.precio_base.toString());
    setDescuentoPlanEdit((plan.descuento_pronto_pago || 0).toString());
    setDiaCobroPlanEdit((plan.dia_cobro_mensual || 1).toString());
    setGraciaPlanEdit((plan.dias_limite_pronto_pago || 5).toString());
    setIsModalPlanOpen(true);
  };

  const savePlan = async () => {
    if (!nombrePlanEdit || !montoPlanEdit) {
      toast.error("Por favor completa los campos obligatorios.");
      return;
    }
    const toastId = toast.loading("Guardando plan...");

    const payload = {
      nombre: nombrePlanEdit,
      precio_base: Number(montoPlanEdit), 
      descuento_pronto_pago: Number(descuentoPlanEdit),
      dia_cobro_mensual: Number(diaCobroPlanEdit),
      dias_limite_pronto_pago: Number(graciaPlanEdit),
      tipo: 'Mensualidad',
      club_id: tenant?.id
    };

    if (planEditando) {
      // Si el nombre cambió, actualizar todos los perfiles asociados
      if (nombrePlanEdit !== planEditando.nombre) {
        await supabase
          .from('perfiles')
          .update({ tipo_plan: nombrePlanEdit })
          .eq('tipo_plan', planEditando.nombre)
          .eq('club_id', tenant?.id);
      }
      const { error } = await supabase.from('planes').update(payload).eq('id', planEditando.id);
      if (error) { toast.error("Error al actualizar: " + error.message, { id: toastId }); return; }
    } else {
      const { error } = await supabase.from('planes').insert([payload]);
      if (error) { toast.error("Error al crear: " + error.message, { id: toastId }); return; }
    }

    toast.success("Plan guardado correctamente", { id: toastId });
    setIsModalPlanOpen(false);
    cargarDatos();
  };

  const getJugadoresPorPlan = (nombrePlan: string) => {
    return jugadores.filter(j => {
      const planJugador = j.tipo_plan || 'Regular';
      return planJugador === nombrePlan;
    });
  };

  // --- CONCEPTOS LOGIC ---
  const handleCreateConcepto = () => {
    setConceptoEditando(null);
    setNombreConceptoEdit('');
    setMontoConceptoEdit('');
    setIsModalConceptoOpen(true);
  };

  const handleEditConcepto = (concepto: any) => {
    setConceptoEditando(concepto);
    setNombreConceptoEdit(concepto.nombre);
    setMontoConceptoEdit((concepto.precio_sugerido || 0).toString());
    setIsModalConceptoOpen(true);
  };

  const saveConcepto = async () => {
    if (!nombreConceptoEdit || !montoConceptoEdit) {
      toast.error("Por favor completa los campos obligatorios.");
      return;
    }
    const toastId = toast.loading("Guardando concepto...");

    const payload = {
      nombre: nombreConceptoEdit,
      precio_sugerido: Number(montoConceptoEdit),
      estado: 'Activo',
      club_id: tenant?.id
    };

    if (conceptoEditando) {
      const { error } = await supabase.from('conceptos_cobro').update(payload).eq('id', conceptoEditando.id);
      if (error) { toast.error("Error al actualizar: " + error.message, { id: toastId }); return; }
    } else {
      const { error } = await supabase.from('conceptos_cobro').insert([payload]);
      if (error) { toast.error("Error al crear: " + error.message, { id: toastId }); return; }
    }

    toast.success("Concepto guardado correctamente", { id: toastId });
    setIsModalConceptoOpen(false);
    cargarDatos();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      
      {/* 1. CABECERA Y BOTÓN VOLVER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div className="flex gap-4 items-start">
          <button 
            onClick={() => router.back()}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2 mt-1"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Planes y Conceptos de Cobro</h1>
            <p className="text-sm text-slate-500 mt-1">Configura las mensualidades, inscripciones, uniformes y otros cobros.</p>
          </div>
        </div>
      </div>

      {/* 2. ALERTA INFORMATIVA */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 shadow-sm">
        <h3 className="text-amber-800 font-bold text-sm mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Diferencia entre Planes y Conceptos
        </h3>
        <ul className="text-sm text-amber-700 space-y-1.5 ml-6 list-disc marker:text-amber-400">
          <li><strong className="font-bold">Planes (Mensualidades):</strong> Son recurrentes. Un alumno está asociado a un Plan que define cuánto paga cada mes.</li>
          <li><strong className="font-bold">Otros Conceptos:</strong> Cobros únicos (Inscripciones, Uniformes). Se seleccionan al registrar un pago en la caja.</li>
        </ul>
      </div>

      {/* TABS */}
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button 
          onClick={() => setTabActivo('planes')}
          className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${tabActivo === 'planes' ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Planes de Mensualidad
        </button>
        <button 
          onClick={() => setTabActivo('conceptos')}
          className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${tabActivo === 'conceptos' ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Tag className="w-4 h-4" /> Otros Conceptos (Inscripción, etc.)
        </button>
      </div>

      {/* --- TAB: PLANES --- */}
      {tabActivo === 'planes' && (
        <>
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar planes..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand outline-none text-sm"
              />
            </div>
            <button 
              onClick={handleCreatePlan}
              className="bg-brand hover:bg-brand/90 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Crear Plan
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {planes.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map((plan) => {
              const alumnosEnPlan = getJugadoresPorPlan(plan.nombre);
              return (
                <div key={plan.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-slate-800">{plan.nombre}</h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">Mensualidad Recurrente</p>
                  </div>

                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <DollarSign className="w-4 h-4 text-emerald-500" /> 
                      Precio: <span className="font-bold text-slate-800">${parseFloat(plan.precio_base).toLocaleString('es-CO')}</span>
                    </div>
                    {plan.descuento_pronto_pago > 0 && (
                      <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit mt-2">
                        <CheckCircle className="w-4 h-4" /> Pronto pago: ${parseFloat(plan.descuento_pronto_pago).toLocaleString('es-CO')} descuento
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-5 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 mb-3">Alumnos Asociados ({alumnosEnPlan.length})</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {alumnosEnPlan.map(a => (
                        <div key={a.id} className="flex justify-between items-center border-b border-slate-200/50 pb-1 last:border-0 last:pb-0">
                          <span className="text-xs text-slate-600 truncate mr-2">{a.nombres} {a.apellidos}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleEditPlan(plan)}
                    className="w-full bg-slate-800 text-white hover:bg-slate-900 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" /> Editar Plan
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* --- TAB: CONCEPTOS --- */}
      {tabActivo === 'conceptos' && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800">Conceptos Disponibles</h2>
            <button 
              onClick={handleCreateConcepto}
              className="bg-brand hover:bg-brand/90 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Crear Concepto
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-black">
                <tr>
                  <th className="px-6 py-4">Concepto de Cobro</th>
                  <th className="px-6 py-4">Precio Sugerido</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {conceptos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No hay conceptos creados. Crea uno como "Inscripción 2026" o "Uniforme".
                    </td>
                  </tr>
                ) : (
                  conceptos.map(concepto => (
                    <tr key={concepto.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-bold text-slate-800">{concepto.nombre}</td>
                      <td className="px-6 py-4 text-emerald-600 font-bold">${parseFloat(concepto.precio_sugerido).toLocaleString('es-CO')}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">{concepto.estado}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleEditConcepto(concepto)}
                          className="text-brand hover:text-brand-dark font-bold text-xs"
                        >
                          EDITAR
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal de Edición de Plan */}
      {isModalPlanOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6">
              <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">
                {planEditando ? `Editar ${planEditando.nombre}` : 'Nuevo Plan'}
              </h3>
              <div className="space-y-5">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre del Plan</label>
                    <input type="text" value={nombrePlanEdit} onChange={(e) => setNombrePlanEdit(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand font-bold" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Precio Base (Mensual)</label>
                    <input type="number" value={montoPlanEdit} onChange={(e) => setMontoPlanEdit(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand font-bold" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Descuento Pronto Pago</label>
                    <input type="number" value={descuentoPlanEdit} onChange={(e) => setDescuentoPlanEdit(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand font-bold text-emerald-600" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Día de Cobro</label>
                        <input type="number" value={diaCobroPlanEdit} onChange={(e) => setDiaCobroPlanEdit(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand font-bold" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Días de Gracia</label>
                        <input type="number" value={graciaPlanEdit} onChange={(e) => setGraciaPlanEdit(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand font-bold" />
                    </div>
                 </div>
              </div>
              <div className="flex gap-3 mt-8">
                 <button onClick={() => setIsModalPlanOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                 <button onClick={savePlan} className="flex-1 px-4 py-3 rounded-xl font-black text-white bg-brand hover:bg-brand/90 transition-all">Guardar</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal de Edición de Concepto */}
      {isModalConceptoOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6">
              <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">
                {conceptoEditando ? `Editar Concepto` : 'Nuevo Concepto'}
              </h3>
              <div className="space-y-5">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre (Ej. Inscripción)</label>
                    <input type="text" value={nombreConceptoEdit} onChange={(e) => setNombreConceptoEdit(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand font-bold" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Precio Sugerido</label>
                    <input type="number" value={montoConceptoEdit} onChange={(e) => setMontoConceptoEdit(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand font-bold text-emerald-600" />
                 </div>
              </div>
              <div className="flex gap-3 mt-8">
                 <button onClick={() => setIsModalConceptoOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                 <button onClick={saveConcepto} className="flex-1 px-4 py-3 rounded-xl font-black text-white bg-brand hover:bg-brand/90 transition-all">Guardar</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}