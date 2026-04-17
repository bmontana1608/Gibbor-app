'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  Home, User, CreditCard, Award, 
  Settings, LogOut, Menu, X, ShieldCheck, 
  Zap, Trophy, Calendar
} from "lucide-react";

export default function FutbolistaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // La seguridad se delega al Middleware (Servidor).
  const [verificando, setVerificando] = useState(false);
  const [usuario, setUsuario] = useState<any>(null);
  const [hijos, setHijos] = useState<any[]>([]);
  const [isDirector, setIsDirector] = useState(false);

  useEffect(() => {
    const cargarPerfil = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Llamamos a nuestra nueva API segura (Server Side) para saltar el RLS
      const cleanEmail = session.user.email?.trim().replace(/\.+@/g, '@').replace(/\.+$/,''); // elimina puntos antes de @ y al final
      console.log("🔍 Escaneando familia vía API Segura para:", cleanEmail);
      
      try {
        const res = await fetch(`/api/familia?email=${cleanEmail}&uid=${session.user.id}`);
        const misPerfiles = await res.json();

        if (Array.isArray(misPerfiles) && misPerfiles.length > 0) {
          console.log("✅ Perfiles encontrados vía API:", misPerfiles.length);
          
          const guardado = localStorage.getItem('hijo_seleccionado_id');
          
          // Filtramos para que en el selector de hijos no aparezca el propio Director
          const soloHijos = misPerfiles.filter(p => p.id !== session.user.id || p.rol !== "Director");
          setHijos(soloHijos);
          
          let perfilActivo = null;
          const miPerfil = misPerfiles.find(p => p.id === session.user.id);

          if (guardado && guardado !== session.user.id) {
            try {
              const resP = await fetch(`/api/perfil?id=${guardado}`);
              const perfilHijo = await resP.json();
              if (perfilHijo && !perfilHijo.error) {
                perfilActivo = perfilHijo;
              } else {
                perfilActivo = soloHijos.length > 0 ? soloHijos[0] : miPerfil;
              }
            } catch (err) {
              perfilActivo = soloHijos.find(h => h.id === guardado) || soloHijos[0] || miPerfil;
            }
          } else {
            // LÓGICA CLAVE: Si soy Director, fuerzo la vista del primer hijo por defecto
            if (miPerfil?.rol === "Director" && soloHijos.length > 0) {
              perfilActivo = soloHijos[0];
              localStorage.setItem('hijo_seleccionado_id', soloHijos[0].id);
            } else {
              perfilActivo = miPerfil || misPerfiles[0];
            }
          }

          setUsuario(perfilActivo);
          console.log("👤 Jugador activo en layout:", perfilActivo?.nombres);
          
          // Verificación de Rango de Director
          const perfilOriginal = misPerfiles.find(p => p.id === session.user.id);
          if (perfilOriginal?.rol === "Director") {
            setIsDirector(true);
          }
        }
      } catch (err) {
        console.error("❌ Fallo en API Familia:", err);
      }
    };
    cargarPerfil();
  }, [router]);

  const cambiarHijo = (hijo: any) => {
    localStorage.setItem('hijo_seleccionado_id', hijo.id);
    setUsuario(hijo);
    setIsSidebarOpen(false);
    toast.success(`Cambiado a perfil de ${hijo.nombres}`);
    
    // Forzamos la recarga para que todas las páginas se enteren
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const menu = [
    { name: "Mi Panel", path: "/futbolista", icon: <Home className="w-5 h-5" /> },
    { name: "Mi Carnet", path: "/futbolista/carnet", icon: <Award className="w-5 h-5" /> },
    { name: "Mis Pagos", path: "/futbolista/pagos", icon: <CreditCard className="w-5 h-5" /> },
    { name: "Seguridad", path: "/futbolista/perfil", icon: <ShieldCheck className="w-5 h-5" /> },
  ];

  if (verificando) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Preparando tu vestuario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans overflow-hidden">
      {/* HEADER MÓVIL */}
      <div className="md:hidden bg-slate-900 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Gibbor" className="w-8 h-8 object-contain" />
          <span className="text-white font-black tracking-tighter uppercase italic text-sm">Gibbor App</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="text-white p-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* ASIDE / SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-slate-900 z-[100] transform transition-transform duration-300 ease-in-out
        md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-8 flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Gibbor" className="w-10 h-10 object-contain shadow-xl shadow-orange-500/10 rounded-full" />
              <div>
                <h1 className="text-white font-black tracking-tighter uppercase italic text-xl leading-none">Gibbor</h1>
                <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest leading-none mt-1">Player Mode</p>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500"><X className="w-6 h-6" /></button>
          </div>

          {/* User Profile Summary */}
          <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 border border-slate-700/50">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold border-2 border-orange-500/50 overflow-hidden shrink-0">
                  {usuario?.foto_url ? (
                    <img src={usuario.foto_url} alt={usuario?.nombres} className="w-full h-full object-cover" />
                  ) : (
                    usuario?.nombres?.charAt(0)
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-white font-bold text-sm truncate">{usuario?.nombres}</p>
                  <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">{usuario?.grupos || "Cadete"}</p>
                </div>
             </div>
          </div>
          {/* Seccion Deslizable */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
            {/* FAMILY SWITCHER - SOLO SI TIENE MÁS DE UN HIJO */}
          {hijos.length > 1 && (
            <div className="mb-10 px-2">
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-3 ml-2">Tu Familia en Gibbor</p>
              <div className="space-y-2">
                {hijos.map((hijo) => {
                  const esActivo = hijo.id === usuario?.id;
                  return (
                    <button 
                      key={hijo.id}
                      onClick={() => cambiarHijo(hijo)}
                      className={`
                        w-full flex items-center gap-3 p-2 rounded-xl transition-all border
                        ${esActivo 
                          ? "bg-orange-500/10 border-orange-500/30 text-orange-500" 
                          : "border-transparent text-slate-400 hover:bg-slate-800/50"}
                      `}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${esActivo ? "bg-orange-500 text-white" : "bg-slate-700 text-slate-400"}`}>
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
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 translate-x-1" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"}
                  `}
                >
                  <span className={`${activo ? "text-white" : "text-slate-500 group-hover:text-orange-400"} transition-colors`}>{item.icon}</span>
                  <span className="font-bold text-sm tracking-tight">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-800/50 mt-6 shrink-0">
            {isDirector && (
              <button 
                onClick={() => router.push("/director")}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-orange-500 bg-orange-500/5 hover:bg-orange-500/10 rounded-2xl transition-all font-black text-xs uppercase tracking-tighter border border-orange-500/20 shadow-xl shadow-orange-500/5 group"
              >
                <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" /> Volver a Director
              </button>
            )}

            <button 
              onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all font-bold text-sm"
            >
              <LogOut className="w-5 h-5" /> Salir
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto bg-[#F8FAFC] md:ml-72">
        <div className="p-4 md:p-10 pb-24">
          {children}
        </div>
      </main>
    </div>
  );
}
