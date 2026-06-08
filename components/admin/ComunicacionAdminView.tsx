'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Megaphone, Plus, Trash2, Edit, Loader2, AlertTriangle, Info, BellRing } from 'lucide-react';

export default function ComunicacionAdminView() {
  const [anuncios, setAnuncios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    mensaje: '',
    tipo: 'Info', // Info, Warning, Urgente
    activo: true
  });

  const cargarAnuncios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('anuncios_globales')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      if (error.code !== '42P01') { // Ignore missing table error initially
        toast.error('Error al cargar anuncios');
      }
    } else {
      setAnuncios(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarAnuncios();
  }, []);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Si vamos a activar este anuncio, desactivamos todos los demás (solo 1 activo a la vez por simplicidad)
    if (formData.activo) {
      await supabase.from('anuncios_globales').update({ activo: false }).neq('id', 0); // Desactiva todos
    }

    const { error } = await supabase
      .from('anuncios_globales')
      .insert([formData]);

    if (error) {
      toast.error('Error al guardar: ' + error.message);
    } else {
      toast.success('Anuncio global publicado');
      setShowModal(false);
      setFormData({ titulo: '', mensaje: '', tipo: 'Info', activo: true });
      cargarAnuncios();
    }
    setSaving(false);
  };

  const toggleEstado = async (id: number, currentEstado: boolean) => {
    if (!currentEstado) {
      // Desactivar todos los demas antes de activar este
      await supabase.from('anuncios_globales').update({ activo: false }).neq('id', 0);
    }
    const { error } = await supabase.from('anuncios_globales').update({ activo: !currentEstado }).eq('id', id);
    if (error) toast.error('Error al cambiar estado');
    else cargarAnuncios();
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas eliminar este anuncio del historial?')) return;
    const { error } = await supabase.from('anuncios_globales').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else {
      toast.success('Anuncio eliminado');
      cargarAnuncios();
    }
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-2 bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
            <Megaphone size={36} className="text-blue-500" />
            Comunicación Global
          </h2>
          <p className="text-gray-500 text-sm font-medium">Transmite anuncios oficiales y alertas a todos los directores de la red MCM.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-4 rounded-xl flex items-center gap-3 transition-all shadow-xl shadow-blue-200 text-xs uppercase tracking-widest"
        >
          <Plus size={18} strokeWidth={3} /> Redactar Anuncio
        </button>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-200 p-8 shadow-sm min-h-[500px]">
        {loading ? (
          <div className="flex justify-center items-center h-64">
             <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
          </div>
        ) : anuncios.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
             <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <BellRing className="w-10 h-10 text-blue-300" />
             </div>
             <h3 className="text-xl font-black text-slate-800 mb-2">Historial de Comunicación Limpio</h3>
             <p className="text-gray-500 text-sm max-w-sm">No has publicado ningún anuncio. Utiliza el botón superior para crear tu primera alerta global a los clubes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {anuncios.map((anuncio) => (
               <div key={anuncio.id} className={`p-6 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 ${anuncio.activo ? 'bg-blue-50/50 border-blue-200 shadow-md shadow-blue-100/50' : 'bg-white border-gray-100'}`}>
                 <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
                         anuncio.tipo === 'Info' ? 'bg-blue-100 text-blue-700' :
                         anuncio.tipo === 'Warning' ? 'bg-amber-100 text-amber-700' :
                         'bg-red-100 text-red-700'
                       }`}>
                         {anuncio.tipo === 'Info' && <Info size={12} />}
                         {anuncio.tipo === 'Warning' && <AlertTriangle size={12} />}
                         {anuncio.tipo === 'Urgente' && <AlertTriangle size={12} />}
                         {anuncio.tipo}
                       </span>
                       <span className="text-xs font-bold text-gray-400">
                         {new Date(anuncio.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                       </span>
                    </div>
                    <h3 className={`text-xl font-black mb-2 ${anuncio.activo ? 'text-blue-900' : 'text-slate-700'}`}>{anuncio.titulo}</h3>
                    <p className={`text-sm leading-relaxed ${anuncio.activo ? 'text-blue-800/80' : 'text-gray-500'}`}>{anuncio.mensaje}</p>
                 </div>
                 <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleEstado(anuncio.id, anuncio.activo)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${anuncio.activo ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${anuncio.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <span className={`text-xs font-black uppercase tracking-widest ${anuncio.activo ? 'text-blue-600' : 'text-gray-400'}`}>{anuncio.activo ? 'Activo' : 'Apagado'}</span>
                    </div>
                    <button onClick={() => handleEliminar(anuncio.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                       <Trash2 size={18} />
                    </button>
                 </div>
               </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white border border-gray-200 rounded-[2rem] w-full max-w-xl p-8 shadow-2xl">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800 mb-6 border-b border-gray-100 pb-4 flex items-center gap-2">
                <Megaphone className="text-blue-500" /> Nuevo Anuncio Global
              </h3>
              <form onSubmit={handleGuardar} className="space-y-5">
                 <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Título Impactante</label>
                    <input type="text" required value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-blue-500 transition-colors" placeholder="Ej: ¡Actualización de plataforma!" />
                 </div>
                 
                 <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Tipo de Notificación (Diseño)</label>
                    <div className="grid grid-cols-3 gap-3">
                       {['Info', 'Warning', 'Urgente'].map(t => (
                         <button type="button" key={t} onClick={() => setFormData({...formData, tipo: t})} className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                           formData.tipo === t 
                             ? (t === 'Info' ? 'bg-blue-100 border-blue-300 text-blue-700' : t === 'Warning' ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-red-100 border-red-300 text-red-700')
                             : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                         }`}>
                           {t}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Mensaje del Anuncio</label>
                    <textarea required rows={4} value={formData.mensaje} onChange={e => setFormData({...formData, mensaje: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:border-blue-500 transition-colors resize-none" placeholder="Escribe el comunicado aquí..." />
                 </div>

                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-blue-900">Activar y Reemplazar</p>
                      <p className="text-xs text-blue-700 mt-1">Al guardar, este anuncio se mostrará inmediatamente a todos los clubes, desactivando cualquier anuncio anterior.</p>
                    </div>
                 </div>
                 
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-black uppercase tracking-widest text-xs transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={saving} className="flex-1 px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publicar Anuncio Ahora'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </section>
  );
}
