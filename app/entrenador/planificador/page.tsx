'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Calendar, List, BookOpen, Save, Trash2, 
  ChevronRight, ClipboardList, PenTool, Layout
} from 'lucide-react';
import { toast } from 'sonner';

export default function PlanificadorEntrenador() {
  const [planes, setPlanes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [formData, setFormData] = useState({
    titulo: '',
    objetivo: '',
    descripcion: '',
    categoria: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  const [categorias, setCategorias] = useState<any[]>([]);

  useEffect(() => {
    async function cargarDatos() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: usuario } = await supabase.from('perfiles').select('nombres, apellidos').eq('id', session.user.id).single();
      const nombreCompleto = `${usuario?.nombres} ${usuario?.apellidos}`;

      const { data: cats } = await supabase.from('categorias').select('*').ilike('entrenadores', `%${nombreCompleto}%`);
      setCategorias(cats || []);

      const { data: planesBD } = await supabase.from('planificaciones').select('*').order('fecha', { ascending: false });
      setPlanes(planesBD || []);
      
      setCargando(false);
    }
    cargarDatos();
  }, []);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const toastId = toast.loading("Guardando plan de sesión...");

    const { error } = await supabase.from('planificaciones').insert([formData]);

    if (error) {
      toast.error("Error al guardar: " + error.message, { id: toastId });
    } else {
      toast.success("¡Plan guardado con éxito!", { id: toastId });
      setMostrarModal(false);
      setFormData({ titulo: '', objetivo: '', descripcion: '', categoria: '', fecha: new Date().toISOString().split('T')[0] });
      // Recargar lista
      const { data } = await supabase.from('planificaciones').select('*').order('fecha', { ascending: false });
      setPlanes(data || []);
    }
    setGuardando(false);
  };

  const eliminarPlan = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este plan?")) return;
    const { error } = await supabase.from('planificaciones').delete().eq('id', id);
    if (!error) {
      setPlanes(planes.filter(p => p.id !== id));
      toast.success("Plan eliminado");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Layout className="w-8 h-8 text-emerald-500" /> Planificador de Entrenos
          </h1>
          <p className="text-slate-500 mt-1">Organiza tus sesiones y metodologías de trabajo.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.location.href = '/entrenador/pizarra'}
            className="bg-white border-2 border-slate-200 text-slate-700 font-bold px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <PenTool className="w-5 h-5 text-orange-500" /> Abrir Pizarra Táctica
          </button>
          <button 
            onClick={() => setMostrarModal(true)}
            className="bg-emerald-600 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
          >
            <Plus className="w-5 h-5" /> Nueva Sesión
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cargando ? (
          <div className="col-span-full py-20 text-center text-slate-400 italic">Cargando tus planificaciones...</div>
        ) : planes.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
            <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No has creado planes de entrenamiento aún.</p>
          </div>
        ) : (
          planes.map(plan => (
            <div key={plan.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl"><BookOpen className="w-5 h-5" /></div>
                  <button onClick={() => eliminarPlan(plan.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{plan.categoria || 'Sin categoría'}</p>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2 group-hover:text-emerald-600 transition-colors">{plan.titulo}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4">{plan.objetivo}</p>
              </div>
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(plan.fecha).toLocaleDateString()}
                </div>
                <button className="text-emerald-600 text-xs font-black flex items-center gap-1 group-hover:gap-2 transition-all">Ver Detalle <ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal para Nuevo Plan */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800">Planificar Sesión</h2>
              <button onClick={() => setMostrarModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            <form onSubmit={handleGuardar} className="p-8 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">Título de la Sesión</label>
                  <input required value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} type="text" placeholder="Ej: Posesión en espacios reducidos" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">Fecha</label>
                  <input required value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} type="date" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Categoría Asignada</label>
                <select required value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                  <option value="">Selecciona Categoría</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Objetivo Principal</label>
                <input required value={formData.objetivo} onChange={(e) => setFormData({...formData, objetivo: e.target.value})} type="text" placeholder="¿Qué quieres lograr hoy?" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Descripción del Trabajo</label>
                <textarea rows={4} value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} placeholder="Detalla los ejercicios, tiempos y rotaciones..." className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" disabled={guardando} className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
                  {guardando ? 'Guardando...' : <><Save className="w-5 h-5" /> Guardar Plan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
