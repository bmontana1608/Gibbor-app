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
  const [verificando, setVerificando] = useState(true);
  const [rol, setRol] = useState<string | null>(null);

  useEffect(() => {
    const verificarCredenciales = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/');
        return;
      }
      
      const { data: perfil, error } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error || !perfil) {
        await supabase.auth.signOut();
        router.push('/');
      } else if (perfil.rol !== 'Entrenador' && perfil.rol !== 'Director') {
        // El director puede entrar a panel de entrenador para supervisar
        router.push('/');
      } else {
        setRol(perfil.rol);
        setVerificando(false);
      }
    };
    
    verificarCredenciales();
  }, [router]);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const menu = [
    { name: 'Inicio', path: '/entrenador', icon: <Home className="w-5 h-5" /> },
    { name: 'Pasar Asistencia', path: '/entrenador/asistencia', icon: <ClipboardCheck className="w-5 h-5" /> },
    { name: 'Planificador', path: '/entrenador/planificador', icon: <Layout className="w-5 h-5 text-orange-500" /> },
    { name: 'Gibbor Points', path: '/entrenador/puntos', icon: <Trophy className="w-5 h-5 text-orange-500" /> },
    { name: 'Stats Lab', path: '/entrenador/stats', icon: <Radar className="w-5 h-5 text-orange-500" /> },
    { name: 'Mis Categorías', path: '/entrenador/categorias', icon: <Users className="w-5 h-5" /> },
    { name: 'Estadísticas', path: '/entrenador/estadisticas', icon: <BarChart className="w-5 h-5" /> },
  ];

  if (verificando) {
    return (
      <div className="flex min-h-screen bg-slate-50 items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-orange-500">
          <Loader className="w-10 h-10 animate-spin" />
          <h2 className="text-xl font-bold text-slate-700">Verificando acceso...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      <div className="md:hidden fixed top-0 w-full bg-white border-b border-slate-200 z-30 flex items-center justify-between p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Gibbor Logo" className="w-8 h-8 object-contain rounded-full shadow-sm" />
          <span className="text-lg font-black text-slate-800 tracking-tight">Gibbor Staff</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 p-1">
          <Menu className="w-7 h-7" />
        </button>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Gibbor Logo" className="w-9 h-9 object-contain rounded-full shadow-sm" />
            <span className="text-xl font-black text-slate-800 tracking-tight">Gibbor Staff</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menu.map((item) => {
            const activo = pathname === item.path || (item.path !== '/entrenador' && pathname.startsWith(item.path));
            return (
              <Link 
                href={item.path} 
                key={item.name}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activo
                    ? 'bg-orange-50 text-orange-600 font-bold shadow-sm border border-orange-100/50'
                    : 'text-slate-500 hover:bg-slate-50 font-medium'
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
          
          {rol === 'Director' && (
            <Link 
              href="/director" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-orange-600 hover:bg-orange-50 font-bold border border-transparent hover:border-orange-100 mt-4"
            >
              <Shield className="w-5 h-5 text-orange-500" />
              <span>Volver a Director</span>
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={cerrarSesion} className="flex items-center gap-3 text-red-500 font-bold px-4 py-3 hover:bg-red-50 w-full rounded-xl transition-colors">
            <LogOut className="w-5 h-5 text-red-400" /> Salir
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50 pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
