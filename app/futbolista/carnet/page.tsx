'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ShieldCheck, Share2, Download, 
  Zap, MapPin, Heart, Fingerprint, ChevronLeft
} from "lucide-react";
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function CarnetFutbolista() {
  const router = useRouter();
  const [clubConfig, setClubConfig] = useState({ nombre_club: 'EFD GIBBOR', temporada_actual: 'Temporada 2024-2025' });
  const [perfil, setPerfil] = useState<any>(null);

  useEffect(() => {
    const fetchDatos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Cargar Configuración del Club
        const { data: cfg } = await supabase.from('configuracion_wa').select('nombre_club, temporada_actual').single();
        if (cfg) setClubConfig(cfg);

        // Identificar el perfil a cargar (Prioridad: Hijo seleccionado en Modo Familia)
        const savedHijoId = typeof window !== 'undefined' ? localStorage.getItem('hijo_seleccionado_id') : null;
        let targetId = savedHijoId || session.user.id;

        try {
          const res = await fetch(`/api/perfil?id=${targetId}`);
          const currentPerfil = await res.json();
          
          if (currentPerfil && !currentPerfil.error) {
            setPerfil(currentPerfil);
          } else {
            // Fallback al perfil de sesión si falla el seleccionado
            const { data: myPerfil } = await supabase.from("perfiles").select("*").eq("id", session.user.id).single();
            setPerfil(myPerfil);
          }
        } catch (err) {
          console.error("Error cargando perfil carnet:", err);
        }
      }
    };
    fetchDatos();
  }, []);

  const handleDownload = async () => {
    const node = document.getElementById('carnet-id-card');
    if (!node) return;

    const toastId = toast.loading("Generando carnet digital...");

    try {
      const dataUrl = await toPng(node, { 
        quality: 1, 
        pixelRatio: 3, 
        backgroundColor: '#0f172a' 
      });
      const link = document.createElement('a');
      link.download = `Carnet_Gibbor_${perfil?.nombres}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("¡Carnet descargado!", { id: toastId });
    } catch (err) {
      toast.error("Error al generar el carnet", { id: toastId });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Carnet Oficial ${clubConfig.nombre_club}`,
          text: `Soy ${perfil?.nombres}, jugador oficial de ${clubConfig.nombre_club}. ¡Mira mi carnet digital!`,
          url: window.location.href,
        });
      } catch (err) {}
    } else {
      toast.info("Copia el link para compartir tu carnet");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10 p-4 pb-20">
      <div className="flex items-center justify-between">
         <button onClick={() => router.back()} className="p-2 bg-slate-100 rounded-full text-slate-500"><ChevronLeft /></button>
         <div className="text-center space-y-1">
            <h1 className="text-xl font-black text-slate-800 tracking-tight italic uppercase">IDENTIDAD {clubConfig.nombre_club}</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">{clubConfig.temporada_actual}</p>
         </div>
         <div className="w-10"></div>
      </div>

      {/* CARNET BOX - THE "WOW" FACTOR */}
      <div className="relative group">
        <div id="carnet-id-card" className="relative w-full max-w-[420px] mx-auto bg-slate-900 aspect-[1.6/1] rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          
          {/* Background Design */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-orange-500 skew-x-[-20deg] translate-x-12 opacity-90"></div>
          <div className="absolute top-0 right-0 w-1/2 h-full bg-orange-600 skew-x-[-15deg] translate-x-20 opacity-50"></div>
          
          {/* Logo & Header */}
          <div className="absolute top-6 left-8 flex items-center gap-2 z-10">
            <img src="/logo.png" alt="Gibbor" className="w-8 h-8 object-contain drop-shadow-md" />
            <span className="text-white font-black italic uppercase tracking-tighter text-sm">{clubConfig.nombre_club}</span>
          </div>

          <div className="absolute top-6 right-8 z-10">
             <span className="bg-white/10 backdrop-blur-md text-white text-[8px] font-black py-1 px-3 rounded-full border border-white/20 uppercase tracking-widest leading-none">{clubConfig.temporada_actual}</span>
          </div>

          {/* Player Identity */}
          <div className="absolute inset-0 p-8 flex items-end">
             <div className="flex gap-6 items-center w-full z-10">
                {/* Photo Placeholder */}
                <div className="w-24 h-24 md:w-28 md:h-28 bg-white rounded-2xl border-4 border-slate-900 overflow-hidden shadow-xl shrink-0">
                   <div className="w-full h-full bg-slate-100 flex items-center justify-center overflow-hidden">
                      {perfil?.foto_url ? (
                        <img src={perfil.foto_url} alt={perfil.nombres} className="w-full h-full object-cover" />
                      ) : (
                        <Fingerprint className="w-10 h-10 text-slate-300" />
                      )}
                   </div>
                </div>

                <div className="flex-1 space-y-1">
                   <h2 className="text-white font-black text-xl md:text-2xl leading-none uppercase truncate">{perfil?.nombres}</h2>
                   <p className="text-white/60 font-bold text-xs uppercase tracking-widest">{perfil?.apellidos}</p>
                   
                   <div className="pt-2 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-orange-400">
                         <MapPin className="w-3 h-3" />
                         <span className="text-[10px] font-bold uppercase tracking-tighter text-white">CAT: {perfil?.grupos || 'S/C'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-orange-400">
                         <Heart className="w-3 h-3" />
                         <span className="text-[10px] font-bold uppercase tracking-tighter text-white">RH: {perfil?.tipo_sangre || 'O+'}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Security Hologram Effect */}
          <div className="absolute bottom-0 right-0 p-4 z-10">
             <div className="w-12 h-12 rounded-full border border-white/20 bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white/40" />
             </div>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex grid grid-cols-2 gap-4">
         <button onClick={handleShare} className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all">
            <Share2 className="w-5 h-5 text-orange-500" /> Compartir
         </button>
         <button onClick={handleDownload} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20">
            <Download className="w-5 h-5 text-orange-400" /> Descargar
         </button>
      </div>

      {/* EMERGENCY INFO */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Información de Emergencia</h4>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
               <p className="text-xs text-slate-400 font-medium">Acudiente Principal</p>
               <p className="font-bold text-slate-800">{perfil?.emergencia_nombre || perfil?.acudiente_nombre || '---'}</p>
            </div>
            <div className="space-y-1">
               <p className="text-xs text-slate-400 font-medium">Contacto de Urgencia</p>
               <p className="font-bold text-slate-800">{perfil?.emergencia_telefono || perfil?.telefono || '---'}</p>
            </div>
         </div>
      </div>
    </div>
  );
}
