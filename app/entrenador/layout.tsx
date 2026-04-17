'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader, LogOut, Menu, X, Home, Users, ClipboardCheck, BarChart, Shield, Layout, Trophy, Radar } from 'lucide-react';

export default function EntrenadorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [rol, setRol] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    async function cargarDatos() {
       const { data: { session } } = await supabase.auth.getSession();
       if (session) {
         const { data } = await supabase.from('perfiles').select('*').eq('id', session.user.id).single();
         if (data) {
           setRol(data.rol);
           setUsuario(data);
         }
       }
    }
    cargarDatos();
  }, []);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const menu = [
    { name: 'Inicio', path: '/entrenador', icon: <Home className="w-5 h-5" /> },
    { name: 'Pasar Asistencia', path: '/entrenador/asistencia', icon: <ClipboardCheck className="w-5 h-5" /> },
    { name: 'Planificador', path: '/entrenador/planificador', icon: <Layout className="w-5 h-5" /> },
    { name: 'Gibbor Points', path: '/entrenador/puntos', icon: <Trophy className="w-5 h-5" /> },
    { name: 'Stats Lab', path: '/entrenador/stats', icon: <Radar className="w-5 h-5" /> },
    { name: 'Mis Categorías', path: '/entrenador/categorias', icon: <Users className="w-5 h-5" /> },
    { name: 'Estadísticas', path: '/entrenador/estadisticas', icon: <BarChart className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* HEADER MÓVIL */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 z-30 flex items-center justify-between p-4 shadow-md">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Gibbor Logo" className="w-8 h-8 object-contain rounded-full" />
          <span className="text-white font-black tracking-tighter uppercase italic text-sm">Gibbor Staff</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="text-white p-1">
          <Menu className="w-7 h-7" />
        </button>
      </div>

      {/* OVERLAY MÓVIL */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ASIDE / SIDEBAR */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-white border-r border-slate-200 flex flex-col z-50 transform transition-all duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 w-64
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Cabecera Sidebar */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Gibbor Logo" className="w-9 h-9 object-contain rounded-full shadow-md" />
              <div>
                <span className="text-xl font-black text-slate-800 tracking-tighter uppercase italic leading-none block">Gibbor</span>
                <span className="text-orange-500 text-[9px] font-black uppercase tracking-widest leading-none">Staff Mode</span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 p-1">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Perfil Staff */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border border-orange-200 shrink-0">
              {usuario?.nombres?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-slate-800 text-sm truncate">{usuario?.nombres}</p>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">{rol}</p>
            </div>
          </div>
        </div>

        {/* Navegación Deslizable */}
        <div className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
          {menu.map((item) => {
            const activo = pathname === item.path || (item.path !== '/entrenador' && pathname.startsWith(item.path));
            return (
              <Link 
                href={item.path} 
                key={item.name}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                  activo
                    ? 'bg-orange-600 text-white font-bold shadow-lg shadow-orange-600/20'
                    : 'text-slate-500 hover:bg-slate-50 font-semibold'
                }`}
              >
                <div className={`${activo ? 'text-white' : 'text-slate-400 group-hover:text-orange-500'} transition-colors`}>
                    {item.icon}
                </div>
                <span className="text-sm tracking-tight">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Pie de Página Fijo */}
        <div className="p-4 border-t border-slate-100 bg-white space-y-2">
            {/* BOTÓN MODO FAMILIA PARA STAFF */}
            <button 
                onClick={() => router.push("/futbolista")}
                className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-slate-100 group shadow-sm"
            >
                <Users className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" /> 
                <span className="truncate">Modo Familia</span>
            </button>

            {rol === 'Director' && (
              <button 
                onClick={() => router.push("/director")}
                className="w-full flex items-center gap-3 px-4 py-3 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all font-black text-xs uppercase tracking-tighter border border-orange-100 shadow-sm group"
              >
                <Shield className="w-5 h-5 group-hover:scale-110 transition-transform" /> Volver a Director
              </button>
            )}

            <button 
                onClick={cerrarSesion} 
                className="w-full flex items-center gap-3 text-slate-400 hover:text-red-500 hover:bg-red-50 px-4 py-3 rounded-xl transition-all font-bold text-sm group"
            >
                <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> <span>Salir</span>
            </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto bg-slate-50 pt-16 md:pt-0">
        <div className="p-4 md:p-8">
            {children}
        </div>
      </main>
    </div>
  );
}
