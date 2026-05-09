'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ShieldCheck, Share2, Download, 
  MapPin, Heart, Fingerprint, ChevronLeft
} from "lucide-react";
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function CarnetFutbolista() {
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      setCargando(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // 1. Obtener Tenant (vía API para asegurar que es el correcto)
        try {
          const resT = await fetch('/api/tenant');
          const tenantData = await resT.json();
          if (tenantData) setTenant(tenantData);
        } catch (err) {
          console.error("Error cargando tenant carnet:", err);
        }

        // 2. Identificar el perfil a cargar
        const savedHijoId = typeof window !== 'undefined' ? localStorage.getItem('hijo_seleccionado_id') : null;
        let targetId = savedHijoId || session.user.id;

        try {
          const { data: currentPerfil, error } = await supabase
            .from("perfiles")
            .select("*, clubes(nombre, logo_url, color_primario)")
            .eq("id", targetId)
            .single();
          
          if (currentPerfil && !error) {
            setPerfil(currentPerfil);
          } else {
            const { data: myPerfil } = await supabase.from("perfiles").select("*, clubes(*)").eq("id", session.user.id).single();
            setPerfil(myPerfil);
          }
        } catch (err) {
          console.error("Error cargando perfil carnet:", err);
        }
      }
      setCargando(false);
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
      link.download = `Carnet_${tenant?.nombre || 'Club'}_${perfil?.nombres}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("¡Carnet descargado!", { id: toastId });
    } catch (err) {
      toast.error("Error al generar el carnet", { id: toastId });
    }
  };

  const handleShare = async () => {
    const clubNombre = tenant?.nombre || 'MCM Club';
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Carnet Oficial ${clubNombre}`,
          text: `Soy ${perfil?.nombres}, jugador oficial de ${clubNombre}. ¡Mira mi carnet digital!`,
          url: window.location.href,
        });
      } catch (err) {}
    } else {
      toast.info("Copia el link para compartir tu carnet");
    }
  };

  const brandColor = tenant?.config?.color || '#06b6d4';
  const brandLogo = tenant?.config?.logo || '/logo.png';
  const clubNombre = tenant?.config?.nombre || 'Cargando...';
  const validacionUrl = typeof window !== 'undefined' ? `${window.location.origin}/validar/${perfil?.id}` : '';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(validacionUrl)}&bgcolor=ffffff&color=${brandColor.replace('#', '')}`;

  return (
    <div className="max-w-2xl mx-auto space-y-10 p-4 pb-20">
      <div className="flex items-center justify-between">
         <button onClick={() => router.back()} className="p-2 bg-slate-100 rounded-full text-slate-500"><ChevronLeft /></button>
         <div className="text-center space-y-1">
            <h1 className="text-xl font-black text-slate-800 tracking-tight italic uppercase">IDENTIDAD {clubNombre}</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">TEMPORADA ACTUAL</p>
         </div>
         <div className="w-10"></div>
      </div>

      {/* CARNET BOX */}
      <div className="relative group">
        {cargando ? (
          <div className="w-full max-w-[420px] mx-auto aspect-[1.6/1] rounded-[2.5rem] bg-slate-200 animate-pulse flex items-center justify-center">
            <ShieldCheck className="w-12 h-12 text-slate-300" />
          </div>
        ) : (
          <div id="carnet-id-card" className="relative w-full max-w-[420px] mx-auto bg-slate-950 aspect-[1.6/1] rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-white/5">
            
            {/* Background Design Dinámico */}
            <div className="absolute top-0 right-0 w-1/2 h-full skew-x-[-20deg] translate-x-12 opacity-90 transition-colors" style={{ backgroundColor: brandColor }}></div>
            <div className="absolute top-0 right-0 w-1/2 h-full skew-x-[-15deg] translate-x-20 opacity-50 transition-colors" style={{ backgroundColor: brandColor }}></div>
            
            {/* Logo & Header */}
            <div className="absolute top-6 left-8 flex items-center gap-2 z-10">
              <img src={brandLogo} alt="Logo" className="w-8 h-8 object-contain drop-shadow-md" />
              <span className="text-white font-black italic uppercase tracking-tighter text-sm">{clubNombre}</span>
            </div>

            <div className="absolute top-6 right-8 z-10">
               <span className="bg-white/10 backdrop-blur-md text-white text-[8px] font-black py-1 px-3 rounded-full border border-white/20 uppercase tracking-widest leading-none">VIGENTE</span>
            </div>

            {/* Player Identity */}
            <div className="absolute inset-0 p-8 flex items-end">
               <div className="flex gap-6 items-center w-full z-10">
                  <div className="w-24 h-24 md:w-28 md:h-28 bg-white rounded-2xl border-4 border-slate-900 overflow-hidden shadow-xl shrink-0">
                     <div className="w-full h-full bg-slate-100 flex items-center justify-center overflow-hidden">
                        {perfil?.foto_url ? (
                          <img src={perfil.foto_url} alt={perfil.nombres} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100">
                            <Fingerprint className="w-10 h-10 text-slate-300" />
                            <span className="text-[8px] font-black text-slate-400 uppercase mt-1">NO FOTO</span>
                          </div>
                        )}
                     </div>
                  </div>

                  <div className="flex-1 space-y-1">
                     <h2 className="text-white font-black text-xl md:text-2xl leading-none uppercase truncate">{perfil?.nombres}</h2>
                     <p className="text-white/60 font-bold text-xs uppercase tracking-widest">{perfil?.apellidos}</p>
                     
                     <div className="pt-2 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 opacity-80">
                           <MapPin className="w-3 h-3 text-white" />
                           <span className="text-[10px] font-bold uppercase tracking-tighter text-white">CAT: {perfil?.grupos || 'S/C'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-80">
                           <Fingerprint className="w-3 h-3 text-white" />
                           <span className="text-[10px] font-bold uppercase tracking-tighter text-white">ID: {perfil?.documento_identidad || 'PENDIENTE'}</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* QR Code Validation */}
            <div className="absolute bottom-6 right-8 z-10 bg-white p-1 rounded-lg shadow-2xl border border-white/20">
               <img src={qrCodeUrl} alt="Validación QR" className="w-12 h-12 md:w-16 md:h-16" />
            </div>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex grid grid-cols-2 gap-4">
         <button onClick={handleShare} className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all">
            <Share2 className="w-5 h-5" style={{ color: brandColor }} /> Compartir
         </button>
         <button onClick={handleDownload} className="text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-xl" style={{ backgroundColor: '#0f172a' }}>
            <Download className="w-5 h-5 opacity-50" /> Descargar
         </button>
      </div>

      {/* EMERGENCY INFO */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Ficha Técnica</h4>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
               <p className="text-xs text-slate-400 font-medium">Documento</p>
               <p className="font-bold text-slate-800">{perfil?.documento_identidad || '---'}</p>
            </div>
            <div className="space-y-1">
               <p className="text-xs text-slate-400 font-medium">Nacimiento</p>
               <p className="font-bold text-slate-800">{perfil?.fecha_nacimiento || '---'}</p>
            </div>
            <div className="space-y-1">
               <p className="text-xs text-slate-400 font-medium">Sangre (RH)</p>
               <p className="font-bold text-slate-800">{perfil?.tipo_sangre || '---'}</p>
            </div>
            <div className="space-y-1">
               <p className="text-xs text-slate-400 font-medium">EPS</p>
               <p className="font-bold text-slate-800">{perfil?.eps || '---'}</p>
            </div>
         </div>

         <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
               <p className="text-xs text-slate-400 font-medium">Acudiente / Emergencia</p>
               <p className="font-bold text-slate-800">{perfil?.emergencia_nombre || perfil?.acudiente_nombre || '---'}</p>
            </div>
            <div className="space-y-1">
               <p className="text-xs text-slate-400 font-medium">Teléfono Urgencia</p>
               <p className="font-bold text-slate-800">{perfil?.emergencia_telefono || perfil?.telefono || '---'}</p>
            </div>
         </div>
      </div>
    </div>
  );
}
