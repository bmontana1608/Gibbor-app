'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Calendar, List, BookOpen, Save, Trash2, 
  ChevronRight, ClipboardList, PenTool, Layout, Video, X
} from 'lucide-react';
import { toast } from 'sonner';

function getEmbedUrl(url: string) {
  if (!url) return null;
  // Limpiar URL
  const cleanUrl = url.trim();
  
  // YouTube (maneja youtu.be, watch?v=, embed/, v/, shorts/)
  const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  
  // Google Drive
  const driveMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  
  return cleanUrl; // fallback
}

function extractVideosFromDescription(desc: string) {
  if (!desc) return { description: '', videoUrls: [] };
  const regex = /\[VIDEO\](.*?)\[\/VIDEO\]/g;
  const videoUrls: string[] = [];
  let match;
  while ((match = regex.exec(desc)) !== null) {
    videoUrls.push(match[1]);
  }
  return {
    description: desc.replace(regex, '').trim(),
    videoUrls
  };
}

export default function PlanificadorEntrenador() {
  const [planes, setPlanes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [verPlan, setVerPlan] = useState<any>(null);

  const [formData, setFormData] = useState({
    titulo: '',
    objetivo: '',
    descripcion: '',
    categoria: '',
    fecha: new Date().toISOString().split('T')[0],
    club_id: '',
    entrenador_id: '',
    videos: [''] // Soporte para múltiples videos
  });

  const [categorias, setCategorias] = useState<any[]>([]);

  useEffect(() => {
    async function cargarDatos() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: usuario } = await supabase.from('perfiles').select('nombres, apellidos, club_id').eq('id', session.user.id).single();
      const nombreCompleto = `${usuario?.nombres} ${usuario?.apellidos}`;

      setFormData(prev => ({ 
        ...prev, 
        club_id: usuario?.club_id || '',
        entrenador_id: session.user.id 
      }));

      const { data: cats } = await supabase.from('categorias').select('*').eq('club_id', usuario?.club_id).ilike('entrenadores', `%${nombreCompleto}%`);
      setCategorias(cats || []);

      const { data: planesBD } = await supabase.from('planificaciones').select('*').eq('club_id', usuario?.club_id).order('fecha', { ascending: false });
      setPlanes(planesBD || []);
      
      setCargando(false);
    }
    cargarDatos();
  }, []);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const toastId = toast.loading("Guardando plan de sesión...");

    // Limpiar videos vacíos y unirlos separados por comas
    const videosLimpios = formData.videos.filter(v => v.trim() !== '');
    const videoUrlString = videosLimpios.join(',');

    const { videos, ...restoFormData } = formData;
    let payload = { ...restoFormData, video_url: videoUrlString };
    
    // Intentar guardar con la columna video_url
    let { error } = await supabase.from('planificaciones').insert([payload]);

    // Fallback: Si la base de datos no tiene la columna video_url, lo agregamos a la descripción
    if (error && (error.message.includes('video_url') || error.message.includes('column'))) {
      const { video_url, ...resto } = payload;
      const fallbackPayload = { ...resto } as any;
      if (videosLimpios.length > 0) {
        fallbackPayload.descripcion = fallbackPayload.descripcion + '\n\n' + videosLimpios.map(v => `[VIDEO]${v}[/VIDEO]`).join('\n');
      }
      const res = await supabase.from('planificaciones').insert([fallbackPayload]);
      error = res.error;
    }

    if (error) {
      toast.error("Error al guardar: " + error.message, { id: toastId });
    } else {
      toast.success("¡Plan guardado con éxito!", { id: toastId });
      setMostrarModal(false);
      setFormData({ 
        titulo: '', 
        objetivo: '', 
        descripcion: '', 
        categoria: '', 
        fecha: new Date().toISOString().split('T')[0],
        club_id: formData.club_id,
        entrenador_id: formData.entrenador_id,
        videos: ['']
      });
      const { data } = await supabase.from('planificaciones').select('*').eq('club_id', formData.club_id).order('fecha', { ascending: false });
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

  const agregarVideoInput = () => {
    setFormData({ ...formData, videos: [...formData.videos, ''] });
  };

  const eliminarVideoInput = (index: number) => {
    const nuevosVideos = formData.videos.filter((_, i) => i !== index);
    setFormData({ ...formData, videos: nuevosVideos });
  };

  const actualizarVideo = (index: number, valor: string) => {
    const nuevosVideos = [...formData.videos];
    nuevosVideos[index] = valor;
    setFormData({ ...formData, videos: nuevosVideos });
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Layout className="w-8 h-8 text-[var(--brand-primary)]" /> Planificador
          </h1>
          <p className="text-slate-500 mt-1">Organiza tus sesiones y metodologías de trabajo.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setMostrarModal(true)}
            className="bg-[var(--brand-primary)] text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:opacity-90 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" /> Nueva Sesión
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cargando ? (
          <div className="col-span-full py-20 text-center text-slate-400 italic">Cargando...</div>
        ) : planes.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
            <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No hay planes creados aún.</p>
          </div>
        ) : (
          planes.map(plan => {
            const urlsEstraidas = extractVideosFromDescription(plan.descripcion).videoUrls;
            const tieneVideo = plan.video_url || urlsEstraidas.length > 0;

            return (
              <div key={plan.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] p-3 rounded-2xl flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      {tieneVideo && <span title="Contiene material audiovisual" className="flex"><Video className="w-4 h-4 text-[var(--brand-primary)] animate-pulse" /></span>}
                    </div>
                    <button onClick={() => eliminarPlan(plan.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{plan.categoria || 'Sin categoría'}</p>
                  <h3 className="text-lg font-black text-slate-800 leading-tight mb-2 group-hover:text-[var(--brand-primary)] transition-colors">{plan.titulo}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">{extractVideosFromDescription(plan.descripcion).description}</p>
                </div>
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(plan.fecha).toLocaleDateString()}
                  </div>
                  <button 
                    onClick={() => setVerPlan(plan)}
                    className="text-[var(--brand-primary)] text-xs font-black flex items-center gap-1 group-hover:gap-2 transition-all"
                  >
                    Ver Detalle <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Detalle */}
      {verPlan && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] p-4 rounded-2xl"><BookOpen className="w-6 h-6" /></div>
                <button onClick={() => setVerPlan(null)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
              </div>
              <p className="text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-[0.2em] mb-2">{verPlan.categoria}</p>
              <h2 className="text-2xl font-black text-slate-900 leading-tight mb-4 uppercase">{verPlan.titulo}</h2>
              <div className="bg-slate-50 p-5 rounded-2xl mb-6">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Objetivo Principal</p>
                <p className="text-slate-700 font-medium">{verPlan.objetivo}</p>
              </div>
              
              {/* Lógica de Multi Videos */}
              {(() => {
                const { description, videoUrls } = extractVideosFromDescription(verPlan.descripcion);
                
                let urlsLista: string[] = [];
                if (verPlan.video_url) {
                  urlsLista = verPlan.video_url.split(',').map((u: string) => u.trim()).filter(Boolean);
                } else {
                  urlsLista = videoUrls;
                }

                const embedUrls = urlsLista.map(getEmbedUrl).filter(Boolean);

                return (
                  <>
                    <div className="space-y-4">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Metodología de Trabajo</p>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{description || 'Sin descripción detallada.'}</p>
                    </div>

                    {embedUrls.length > 0 && (
                      <div className="mt-8 space-y-6">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Video className="w-4 h-4 text-brand" /> Material Audiovisual ({embedUrls.length})
                        </p>
                        <div className="grid grid-cols-1 gap-6">
                          {embedUrls.map((embedUrl, idx) => (
                            <div key={idx} className="aspect-video w-full bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-200">
                              <iframe 
                                src={embedUrl!} 
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end">
                <button 
                  onClick={() => setVerPlan(null)}
                  className="bg-slate-900 text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800">Planificar Sesión</h2>
              <button onClick={() => setMostrarModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            <form onSubmit={handleGuardar} className="p-8 overflow-y-auto space-y-6 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">Título</label>
                  <input required value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">Fecha</label>
                  <input required value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} type="date" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Categoría</label>
                <select required value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] outline-none bg-white">
                  <option value="">Selecciona...</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Objetivo</label>
                <input required value={formData.objetivo} onChange={(e) => setFormData({...formData, objetivo: e.target.value})} type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] outline-none" />
              </div>
              
              {/* Campo para Múltiples Videos */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2 flex items-center gap-2">
                  <Video className="w-4 h-4" /> Videos de Apoyo (YouTube o Drive)
                </label>
                <div className="space-y-3">
                  {formData.videos.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input 
                        value={url} 
                        onChange={(e) => actualizarVideo(idx, e.target.value)} 
                        type="url" 
                        placeholder="Enlace de YouTube o Google Drive..." 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] outline-none text-sm placeholder:text-slate-300" 
                      />
                      {formData.videos.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => eliminarVideoInput(idx)}
                          className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button 
                  type="button" 
                  onClick={agregarVideoInput}
                  className="mt-3 text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-all"
                >
                  <Plus className="w-3 h-3" /> Agregar otro video
                </button>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Descripción y Metodología</label>
                <textarea rows={4} value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] outline-none resize-none"></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" disabled={guardando} className="flex-1 bg-[var(--brand-primary)] text-white font-black py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2">
                  {guardando ? 'Guardando...' : <Save className="w-5 h-5" />} Guardar Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
