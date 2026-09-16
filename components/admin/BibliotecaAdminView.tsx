'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Plus, PlaySquare, Video, Trash2, Search, Edit, Smartphone } from 'lucide-react';
import { getYouTubeId, isDriveUrl, getDriveId, getEmbedUrl, getTikTokId, resolveShortUrl } from '@/lib/utils/videos';

const TikTokThumbnail = ({ url, onClick }: { url: string, onClick: () => void }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/tiktok-oembed?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => {
        if (mounted && data.thumbnailUrl) {
          setThumbUrl(data.thumbnailUrl);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (mounted) setError(true);
      });
    return () => { mounted = false; };
  }, [url]);

  return (
    <div 
      className="w-full h-40 bg-black rounded-t-2xl flex items-center justify-center border-b border-gray-200 group cursor-pointer relative overflow-hidden"
      onClick={onClick}
    >
      {thumbUrl && !error ? (
        <img 
          src={thumbUrl} 
          alt="TikTok Thumbnail"
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
          referrerPolicy="no-referrer"
          onError={() => setError(true)}
        />
      ) : (
        <div className="absolute inset-0 opacity-20 bg-gradient-to-tr from-[#00f2fe] to-[#4facfe]"></div>
      )}
      <div className="w-12 h-12 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 shadow-[0_0_15px_rgba(255,0,80,0.5)] border border-[#00f2fe]/50">
         <PlaySquare className="text-white w-5 h-5 ml-0.5" />
      </div>
    </div>
  );
};

export default function BibliotecaAdminView() {
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    video_url: '',
    fase_juego: 'Parte Principal',
    categoria_edad: 'Todas',
    tipo: 'Técnico'
  });

  const cargarEjercicios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('biblioteca_ejercicios')
      .select('*')
      .eq('scope', 'Global')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar la biblioteca global');
    } else {
      setEjercicios(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarEjercicios();
  }, []);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Resolve short URL (like TikTok vt.tiktok.com) before saving
    const finalUrl = await resolveShortUrl(formData.video_url);

    const userResp = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('biblioteca_ejercicios')
      .insert({
        ...formData,
        video_url: finalUrl,
        scope: 'Global',
        autor_id: userResp.data.user?.id
      })
      .select();

    if (error) {
      toast.error('Error al guardar: ' + error.message);
    } else {
      toast.success('Ejercicio global añadido con éxito');
      setShowModal(false);
      setFormData({
        titulo: '', descripcion: '', video_url: '', fase_juego: 'Parte Principal', categoria_edad: 'Todas', tipo: 'Técnico'
      });
      cargarEjercicios();
    }
    setSaving(false);
  };

  const handleEliminar = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este ejercicio global? Se borrará para todos los clubes.')) return;
    
    const { error } = await supabase.from('biblioteca_ejercicios').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar');
    } else {
      toast.success('Ejercicio eliminado');
      cargarEjercicios();
    }
  };

  const renderVideoThumbnail = (ejercicio: any) => {
    const url = ejercicio.video_url;
    if (playingVideoId === ejercicio.id) {
      const embedUrl = getEmbedUrl(url);
      if (embedUrl) {
        const isMp4 = embedUrl.endsWith('.mp4');
        return (
          <div className="relative w-full h-40 bg-black rounded-t-2xl overflow-hidden">
            {isMp4 ? (
              <video 
                src={embedUrl}
                controls
                autoPlay
                {...({ referrerPolicy: "no-referrer" } as any)}
                className="w-full h-full object-contain"
              ></video>
            ) : (
              <iframe 
                src={embedUrl} 
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            )}
          </div>
        );
      }
    }

    const ytId = getYouTubeId(url);
    if (ytId) {
      return (
        <div 
          className="relative w-full h-40 bg-zinc-950 rounded-t-2xl overflow-hidden group cursor-pointer"
          onClick={() => setPlayingVideoId(ejercicio.id)}
        >
          <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Thumbnail" />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-12 h-12 bg-red-600/90 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                <PlaySquare className="text-white w-6 h-6 ml-1" />
             </div>
          </div>
        </div>
      );
    }
    if (isDriveUrl(url)) {
      const driveId = getDriveId(url);
      return (
        <div 
          className="relative w-full h-40 bg-zinc-950 rounded-t-2xl overflow-hidden group cursor-pointer"
          onClick={() => setPlayingVideoId(ejercicio.id)}
        >
          {driveId ? (
            <img src={`https://drive.google.com/thumbnail?id=${driveId}&sz=w800`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Thumbnail" />
          ) : (
            <div className="w-full h-full bg-blue-900/20 flex items-center justify-center">
              <Video className="text-blue-400 w-8 h-8" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-12 h-12 bg-blue-600/90 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                <PlaySquare className="text-white w-6 h-6 ml-1" />
             </div>
          </div>
        </div>
      );
    }
    const tiktokId = getTikTokId(url);
    if (tiktokId) {
      return <TikTokThumbnail url={url} onClick={() => setPlayingVideoId(ejercicio.id)} />;
    }
    return (
      <div className="w-full h-40 bg-gray-100 rounded-t-2xl flex items-center justify-center border-b border-gray-200">
        <Video className="text-gray-400 w-10 h-10" />
      </div>
    );
  };

  const filtrados = ejercicios.filter(e => e.titulo.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-2 bg-gradient-to-r from-lime-500 to-emerald-600 bg-clip-text text-transparent">Biblioteca MCM Global</h2>
          <p className="text-gray-500 text-sm font-medium">Gestiona los ejercicios maestro que todos los clubes verán por defecto.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-lime-500 hover:bg-lime-400 text-white font-black px-6 py-4 rounded-xl flex items-center gap-3 transition-all shadow-xl shadow-lime-200 text-xs uppercase tracking-widest"
        >
          <Plus size={18} strokeWidth={3} /> Subir Ejercicio Global
        </button>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-200 p-8 shadow-sm min-h-[500px]">
        <div className="flex items-center gap-4 mb-8 bg-gray-50 p-2 rounded-2xl border border-gray-200">
           <Search className="text-gray-400 ml-4 w-5 h-5" />
           <input 
             type="text" 
             placeholder="Buscar en la base maestra..." 
             className="bg-transparent border-none text-slate-800 outline-none flex-1 py-3 text-sm font-bold placeholder:text-gray-400"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-12 h-12 text-lime-500 animate-spin" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <PlaySquare className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold">No hay ejercicios globales registrados.</p>
            <p className="text-xs text-gray-400 mt-2">Sube el primer video para enriquecer la red MCM.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtrados.map(ejercicio => (
              <div key={ejercicio.id} className="bg-white border border-gray-200 rounded-2xl hover:border-lime-400 transition-all flex flex-col group shadow-sm">
                {renderVideoThumbnail(ejercicio)}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-lime-100 text-lime-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md">
                      {ejercicio.fase_juego}
                    </span>
                    <span className="bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md">
                      {ejercicio.categoria_edad}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-800 leading-tight mb-2 uppercase italic tracking-tighter">{ejercicio.titulo}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 flex-1 mb-4">{ejercicio.descripcion}</p>
                  
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                     <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Scope Global
                     </span>
                     <button onClick={() => handleEliminar(ejercicio.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                     </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white border border-gray-200 rounded-[2rem] w-full max-w-2xl p-8 shadow-2xl">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800 mb-6 border-b border-gray-100 pb-4">Añadir Ejercicio Maestro</h3>
              <form onSubmit={handleGuardar} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Título del Ejercicio</label>
                      <input type="text" required value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-lime-500" placeholder="Ej: Rondo de Activación 4v2" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Link del Video (Drive o YouTube)</label>
                      <input type="url" required value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800 font-mono text-sm outline-none focus:border-lime-500" placeholder="https://..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Fase del Entrenamiento</label>
                      <select value={formData.fase_juego} onChange={e => setFormData({...formData, fase_juego: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-lime-500">
                         <option value="Calentamiento">Calentamiento</option>
                         <option value="Parte Principal">Parte Principal</option>
                         <option value="Vuelta a la Calma">Vuelta a la Calma</option>
                         <option value="Físico">Trabajo Físico</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Categoría Recomendada</label>
                      <select value={formData.categoria_edad} onChange={e => setFormData({...formData, categoria_edad: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-lime-500">
                         <option value="Todas">Todas las categorías</option>
                         <option value="Iniciación (U6-U10)">Iniciación (U6-U10)</option>
                         <option value="Formación (U12-U14)">Formación (U12-U14)</option>
                         <option value="Competencia (U15+)">Competencia (U15+)</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Descripción y Reglas</label>
                      <textarea required rows={4} value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:border-lime-500 custom-scrollbar" placeholder="Detalla cómo se ejecuta el ejercicio..." />
                    </div>
                 </div>
                 
                 <div className="flex gap-4 pt-6 border-t border-gray-100 mt-6">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-black uppercase tracking-widest text-xs transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={saving} className="flex-1 px-6 py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-white font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-lime-200">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar y Publicar Global'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </section>
  );
}
