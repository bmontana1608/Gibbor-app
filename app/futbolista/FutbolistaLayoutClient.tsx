'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import PushPermissionBanner from "@/components/PushPermissionBanner";
import NotificationBell from "@/components/NotificationBell";
import GibbiAssistant from "@/components/GibbiAssistant";
import { 
  Home, User, CreditCard, Award, 
  Settings, LogOut, Menu, X, ShieldCheck, 
  Zap, Trophy, Calendar, Bell, ArrowRightLeft, Play
} from "lucide-react";

interface FutbolistaLayoutClientProps {
  children: React.ReactNode;
  initialTenant: any;
  initialProfile: any;
  initialFamily: any[];
}

export default function FutbolistaLayoutClient({ children, initialTenant, initialProfile, initialFamily }: FutbolistaLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const tenant = initialTenant;
  const usuario = initialProfile;
  const hijos = initialFamily;
  const mainRef = useRef<HTMLElement>(null);

  const tenantSlug = tenant?.slug || '';
  const basePath = tenantSlug && tenantSlug !== 'master' ? `/${tenantSlug}` : '';

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    window.location.href = `${basePath}/login`;
  };

  // Cerrar menú y resetear scroll al navegar
  useEffect(() => {
    if (isSidebarOpen) setIsSidebarOpen(false);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname]);

  const menu = [
    { name: "Mi Panel", path: `${basePath}/futbolista`, icon: <Home className="w-5 h-5" /> },
    { name: "Mis Pagos", path: `${basePath}/futbolista/pagos`, icon: <CreditCard className="w-5 h-5" /> },
    // { name: "Partidos Live", path: `${basePath}/futbolista/partidos`, icon: <Play className="w-5 h-5" /> }, // Temporalmente oculto
    { name: "Mi Carnet", path: `${basePath}/futbolista/carnet`, icon: <Award className="w-5 h-5" /> },
    { name: "Seguridad", path: `${basePath}/futbolista/perfil`, icon: <ShieldCheck className="w-5 h-5" /> },
  ];

  const brandName = tenant?.config?.nombre || tenant?.nombre || 'Club';
  const brandLogo = tenant?.config?.logo || tenant?.logo_url || '/logo.png';
  const brandColor = tenant?.config?.color || tenant?.color_primario || '#06b6d4';

  return (
    <div key={`${tenantSlug}-${pathname}`} className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --brand-primary: ${brandColor};
        }
      `}} />
      <PushPermissionBanner />
      
      {/* HEADER MÓVIL */}
      <div className="md:hidden bg-slate-900 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={brandLogo} alt="Logo" className="w-8 h-8 object-contain" />
          <span className="text-white font-black tracking-tighter uppercase italic text-sm">{brandName}</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(prev => !prev)}
          aria-label="Abrir menú"
          style={{ touchAction: 'manipulation' }}
          className="text-white p-2 active:scale-95 transition-transform"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* OVERLAY MÓVIL - condicional para evitar bloqueos fantasma */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/70 z-[90] md:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ASIDE / SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-slate-900 z-[100] transform transition-transform duration-300 ease-in-out
        md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none md:pointer-events-auto'}
      `}>
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <img src={brandLogo} alt="Logo" className="w-10 h-10 object-contain shadow-xl rounded-full" />
              <div>
                <h1 className="text-white font-black tracking-tighter uppercase italic text-xl leading-none">{brandName}</h1>
                <p className="text-brand text-[10px] font-black uppercase tracking-widest leading-none mt-1">Player Mode</p>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500"><X className="w-6 h-6" /></button>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 border border-slate-700/50">
             <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand/50 overflow-hidden shrink-0 flex items-center justify-center text-white font-black text-lg shadow-inner">
                  {usuario?.foto_url ? (
                    <img src={usuario.foto_url} alt={usuario?.nombres} className="w-full h-full object-cover" />
                  ) : (
                    usuario?.nombres?.charAt(0)
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-white font-bold text-sm truncate">{usuario?.nombres}</p>
                  <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">{usuario?.grupos || "Atleta"}</p>
                </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
            {hijos.length > 1 && (
              <div className="mb-10 px-2">
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-3 ml-2">Tu Familia</p>
                <div className="space-y-2">
                  {hijos.map((hijo) => {
                    const esActivo = hijo.id === usuario?.id;
                    return (
                      <button 
                        key={hijo.id}
                        onClick={() => {
                          localStorage.setItem('hijo_seleccionado_id', hijo.id);
                          window.location.href = `${basePath}/futbolista`;
                        }}
                        className={`
                          w-full flex items-center gap-3 p-2 rounded-xl transition-all border
                          ${esActivo 
                            ? "border-brand/30 bg-brand/10 text-brand" 
                            : "border-transparent text-slate-400 hover:bg-slate-800/50"}
                        `}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${esActivo ? "bg-brand text-white" : "bg-slate-700 text-slate-400"}`}>
                          {hijo.nombres.charAt(0)}
                        </div>
                        <span className="text-xs font-bold truncate">{hijo.nombres}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <nav className="space-y-2 flex-1">
              {menu.map((item) => {
                const activo = pathname === item.path;
                return (
                  <Link 
                    key={item.path} 
                    href={item.path} 
                    onClick={() => setIsSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-300 group
                      ${activo 
                        ? "bg-brand text-white shadow-lg translate-x-1" 
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"}
                    `}
                  >
                    <span className={`${activo ? "text-white" : "text-slate-500 group-hover:text-brand"} transition-colors`}>{item.icon}</span>
                    <span className="font-bold text-sm tracking-tight">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 bg-slate-950/50 rounded-[1.5rem] border border-slate-800 shadow-xl relative overflow-hidden">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ArrowRightLeft className="w-3 h-3" /> Otros Espacios
               </p>
               <div className="space-y-2">
                  {initialProfile?.rol === 'Entrenador' && (
                    <Link 
                        href={`${basePath}/entrenador`}
                        className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-all group"
                    >
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-lg">
                            <Zap className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">Modo Staff</span>
                    </Link>
                  )}

                  {initialProfile?.rol === 'Director' && (
                    <Link 
                        href={`${basePath}/director`}
                        className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-all group"
                    >
                        <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center text-white shadow-lg">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">Panel Director</span>
                    </Link>
                  )}
               </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-800/50 mt-6 shrink-0">
            <button 
              onClick={cerrarSesion}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all font-bold text-sm"
            >
              <LogOut className="w-5 h-5" /> Salir
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main ref={mainRef} className="flex-1 overflow-y-auto bg-[#F8FAFC] md:ml-72">
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 md:px-10 py-4 flex items-center justify-between z-40">
           <div className="flex flex-col">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter italic">Centro de Control</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{usuario?.nombres ? `Jugador: ${usuario.nombres}` : 'Cargando...'}</p>
           </div>
           <div className="flex items-center gap-3">
              <ThemeToggle />
              <NotificationBell clubId={tenant?.id} />
           </div>
        </div>
        <div className="p-4 md:p-10 pb-24 mx-auto max-w-7xl">
          {children}
        </div>
      </main>
      <div className="fixed bottom-6 right-6 z-50">
        <GibbiAssistant clubId={tenant?.id} role={usuario?.rol || 'Futbolista'} />
      </div>
    </div>
  );
}
