'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/hooks/useTenant';
import { toast } from 'sonner';
import { Loader2, Plus, PlaySquare, Video, Search, ShieldCheck, Smartphone } from 'lucide-react';
import { getYouTubeId, isDriveUrl, getDriveId, getEmbedUrl, getTikTokId, resolveShortUrl } from '@/lib/utils/videos';

export default function BibliotecaDirector() {
  const { slug } = useTenant();
  const [clubId, setClubId] = useState<string | null>(null);
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroVista, setFiltroVista] = useState<'Todos' | 'Global' | 'Club'>('Todos');
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
    
    const userResp = await supabase.auth.getUser();
    if (userResp.data.user) {
      const { data: perfil } = await supabase.from('perfiles').select('club_id').eq('id', userResp.data.user.id).single();
      if (perfil) setClubId(perfil.club_id);
    }
    
    // RLS will automatically restrict to Global + own Club
    const { data, error } = await supabase
      .from('biblioteca_ejercicios')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar la biblioteca');
    } else {
      setEjercicios(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarEjercicios();
  }, [slug]);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) {
      toast.error('No se pudo identificar tu club.');
      return;
    }
    setSaving(true);
    
    const finalUrl = await resolveShortUrl(formData.video_url);

    const userResp = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('biblioteca_ejercicios')
      .insert({
        ...formData,
        video_url: finalUrl,
        scope: 'Club',
        club_id: clubId,
        autor_id: userResp.data.user?.id
      })
      .select();

    if (error) {
      toast.error('Error al guardar: ' + error.message);
    } else {
      toast.success('Ejercicio añadido a la biblioteca del club');
      setShowModal(false);
      setFormData({
        titulo: '', descripcion: '', video_url: '', fase_juego: 'Parte Principal', categoria_edad: 'Todas', tipo: 'Técnico'
      });
      cargarEjercicios();
    }
    setSaving(false);
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
          className="relative w-full h-40 bg-slate-900 rounded-t-2xl overflow-hidden group cursor-pointer"
          onClick={() => setPlayingVideoId(ejercicio.id)}
        >
          <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Thumbnail" />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-12 h-12 bg-brand/90 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
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
          className="relative w-full h-40 bg-slate-900 rounded-t-2xl overflow-hidden group cursor-pointer"
          onClick={() => setPlayingVideoId(ejercicio.id)}
        >
          {driveId ? (
            <img src={`https://drive.google.com/thumbnail?id=${driveId}&sz=w800`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Drive Thumbnail" />
          ) : (
            <div className="w-full h-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Video className="text-blue-500 w-8 h-8" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-12 h-12 bg-brand/90 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                <PlaySquare className="text-white w-6 h-6 ml-1" />
             </div>
          </div>
        </div>
      );
    }
    const tiktokId = getTikTokId(url);
    if (tiktokId) {
      return (
        <div 
          className="w-full h-40 bg-black rounded-t-2xl flex items-center justify-center border-b border-zinc-800 group cursor-pointer relative overflow-hidden"
          onClick={() => setPlayingVideoId(ejercicio.id)}
        >
          <img 
            src={`https://www.tikwm.com/video/cover/${tiktokId}.webp`} 
            alt="TikTok Thumbnail"
            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
            referrerPolicy="no-referrer"
            onError={(e) => {
               (e.target as HTMLImageElement).style.display = 'none';
               const fallback = (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-tiktok');
               if (fallback) fallback.classList.remove('hidden');
            }}
          />
          <div className="fallback-tiktok hidden absolute inset-0 opacity-20 bg-gradient-to-tr from-[#00f2fe] to-[#4facfe]"></div>
          <div className="w-12 h-12 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 shadow-[0_0_15px_rgba(255,0,80,0.5)] border border-[#00f2fe]/50">
             <PlaySquare className="text-white w-5 h-5 ml-0.5" />
          </div>
        </div>
      );
    }
    return (
      <div className="w-full h-40 bg-slate-100 dark:bg-slate-900 rounded-t-2xl flex items-center justify-center border-b border-slate-200 dark:border-slate-800">
        <Video className="text-slate-400 w-10 h-10" />
      </div>
    );
  };

  const filtrados = ejercicios.filter(e => {
    const cumpleFiltro = filtroVista === 'Todos' || e.scope === filtroVista;
    const cumpleBusqueda = e.titulo.toLowerCase().includes(searchTerm.toLowerCase());
    return cumpleFiltro && cumpleBusqueda;
  });

  return (
    <div className="p-4 md:p-6 min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 transition-colors animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            Biblioteca de Metodología <ShieldCheck className="text-brand w-6 h-6" />
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona los ejercicios oficiales de la franquicia y del club.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-brand text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:-translate-y-1 hover:shadow-brand/30 transition-all text-sm"
        >
          <Plus size={18} /> Subir Ejercicio Local
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl w-full md:w-auto">
            {['Todos', 'Global', 'Club'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFiltroVista(tab as any)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex-1 md:flex-none ${
                  filtroVista === tab 
                    ? 'bg-white dark:bg-slate-800 text-brand shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab === 'Global' ? 'Base MCM' : tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 px-4 py-2.5 rounded-xl w-full md:w-80 border border-transparent focus-within:border-brand/30 transition-colors">
             <Search className="w-4 h-4 text-slate-400" />
             <input 
                type="text"
                placeholder="Buscar drill..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-medium w-full text-slate-800 dark:text-white placeholder:text-slate-400"
             />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-10 h-10 text-brand animate-spin" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
             <PlaySquare className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-4" />
             <p className="font-bold text-slate-500">No hay ejercicios en esta vista.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {filtrados.map(ejercicio => (
                <div key={ejercicio.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:border-brand/30 transition-all flex flex-col group">
                   {renderVideoThumbnail(ejercicio)}
                   <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                         <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-brand-muted text-brand rounded-md">
                           {ejercicio.fase_juego}
                         </span>
                         {ejercicio.scope === 'Global' && (
                           <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md flex items-center gap-1">
                             <ShieldCheck className="w-3 h-3 text-emerald-500" /> Oficial MCM
                           </span>
                         )}
                      </div>
                      <h3 className="font-black text-slate-800 dark:text-white leading-tight mb-2 tracking-tight line-clamp-2">{ejercicio.titulo}</h3>
                      <p className="text-xs text-slate-500 line-clamp-3 mb-4 flex-1">{ejercicio.descripcion}</p>
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end animate-in slide-in-from-right duration-300">
           <div className="bg-white dark:bg-slate-950 w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                 <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Nuevo Ejercicio del Club</h2>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Añadir a metodología oficial de la academia</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                 <form id="drill-form" onSubmit={handleGuardar} className="space-y-5">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Título del Ejercicio</label>
                      <input type="text" required value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand/50" placeholder="Ej: Rondo de Presión" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Enlace de YouTube o Google Drive</label>
                      <input type="url" required value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-brand/50" placeholder="https://..." />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fase de Sesión</label>
                         <select value={formData.fase_juego} onChange={e => setFormData({...formData, fase_juego: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand/50">
                            <option value="Calentamiento">Calentamiento</option>
                            <option value="Parte Principal">Parte Principal</option>
                            <option value="Vuelta a la Calma">Vuelta a la Calma</option>
                            <option value="Físico">Físico</option>
                         </select>
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Categoría</label>
                         <select value={formData.categoria_edad} onChange={e => setFormData({...formData, categoria_edad: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand/50">
                            <option value="Todas">Todas</option>
                            <option value="U6-U10">U6-U10</option>
                            <option value="U12-U14">U12-U14</option>
                            <option value="U15+">U15+</option>
                         </select>
                       </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Instrucciones Metodológicas</label>
                      <textarea required rows={5} value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/50 custom-scrollbar" placeholder="Explica las dimensiones de la cancha, comodines y reglas especiales..." />
                    </div>
                 </form>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-4 bg-slate-50 dark:bg-slate-950">
                 <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                   Cancelar
                 </button>
                 <button type="submit" form="drill-form" disabled={saving} className="flex-1 px-4 py-3 rounded-xl bg-brand text-white font-bold hover:bg-brand/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand/20">
                   {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Añadir a Biblioteca'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
