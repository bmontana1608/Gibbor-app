'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Home, User, CreditCard, Award, 
  Settings, LogOut, Menu, X, ShieldCheck, 
  Zap, Trophy, Calendar
} from "lucide-react";

export default function FutbolistaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    const verificarUsuario = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!perfil || (perfil.rol !== "Futbolista" && perfil.rol !== "Jugador" && perfil.rol !== "Director")) {
        router.push("/");
        return;
      }

      if (perfil.rol === "Director") {
        const { data: config } = await supabase.from("configuracion_wa").select("hijos_config").single();
        if (config?.hijos_config) {
          const ids = config.hijos_config.split(",");
          const { data: hijoPerfil } = await supabase.from("perfiles").select("*").eq("id", ids[0]).single();
          if (hijoPerfil) {
            setUsuario(hijoPerfil);
            setVerificando(false);
            return;
          }
        }
      }

      setUsuario(perfil);
      setVerificando(false);
    };
    verificarUsuario();
  }, [router]);

  const menu = [
    { name: "Mi Panel", path: "/futbolista", icon: <Home className="w-5 h-5" /> },
    { name: "Mi Carnet", path: "/futbolista/carnet", icon: <Award className="w-5 h-5" /> },
    { name: "Mis Pagos", path: "/futbolista/pagos", icon: <CreditCard className="w-5 h-5" /> },
    { name: "Mi Perfil", path: "/futbolista/perfil", icon: <User className="w-5 h-5" /> },
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
        md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
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
          <div className="bg-slate-800/50 rounded-2xl p-4 mb-10 border border-slate-700/50">
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

          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
            className="flex items-center gap-3 px-5 py-3.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all mt-auto font-bold text-sm"
          >
            <LogOut className="w-5 h-5" /> Salir
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
        <div className="p-4 md:p-10 pb-24">
          {children}
        </div>
      </main>
    </div>
  );
}
