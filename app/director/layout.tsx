'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader, LogOut, Menu, X, Home, Users, CreditCard, ClipboardCheck, Tags, BarChart, Briefcase, UserCheck } from 'lucide-react';

export default function DirectorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Estado para controlar si el menú hamburguesa está abierto o cerrado
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Control de seguridad y autorización
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    const verificarCredenciales = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // No hay sesión en absoluto
        router.push('/');
        return;
      }
      
      // Tiene sesión, veamos si es Director en la base de datos
      const { data: perfil, error } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error || !perfil) {
        // Fallo crítico de integridad, cerramos sesión de emergencia
        await supabase.auth.signOut();
        router.push('/');
      } else if (perfil.rol !== 'Director') {
        // Intentó entrar siendo Entrenador, Padre o Jugador
        router.push('/');
      } else {
        // Todo en orden, es el Director
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
    { name: 'Inicio (Dashboard)', path: '/director', icon: <Home className="w-5 h-5" /> },
    { name: 'Miembros', path: '/director/miembros', icon: <Users className="w-5 h-5" /> },
    { name: 'Cobranza', path: '/director/cobranza', icon: <CreditCard className="w-5 h-5" /> },
    { name: 'Nómina', path: '/director/nomina', icon: <Briefcase className="w-5 h-5" /> },
    { name: 'Asistencia', path: '/director/asistencia', icon: <ClipboardCheck className="w-5 h-5" /> },
    { name: 'Categorías', path: '/director/categorias', icon: <Tags className="w-5 h-5" /> },
    { name: 'Reportes', path: '/director/reportes', icon: <BarChart className="w-5 h-5" /> },
    { name: 'Vista Entrenador', path: '/entrenador', icon: <UserCheck className="w-5 h-5 text-emerald-500" /> },
  ];

  /* PANTALLA DE CARGA DE SEGURIDAD */
  if (verificando) {
    return (
      <div className="flex min-h-screen bg-slate-50 items-center justify-center font-sans tracking-tight">
        <div className="flex flex-col items-center gap-4 text-orange-500">
          <Loader className="w-10 h-10 animate-spin" />
          <h2 className="text-xl font-bold text-slate-700">Verificando seguridad...</h2>
          <p className="text-sm text-slate-400">Protegiendo el área de dirección</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* =========================================
          HEADER MÓVIL (Solo visible en celulares) 
          ========================================= */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b border-slate-200 z-30 flex items-center justify-between p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Gibbor Logo" className="w-8 h-8 object-contain rounded-full shadow-sm" />
          <span className="text-lg font-black text-slate-800 tracking-tight">Gibbor App</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="text-slate-600 hover:text-orange-600 focus:outline-none p-1 transition-colors"
        >
          <Menu className="w-7 h-7" />
        </button>
      </div>

      {/* =========================================
          OVERLAY OSCURO (Para cerrar tocando afuera) 
          ========================================= */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* =========================================
          MENÚ LATERAL (Fijo en PC, Deslizante en Móvil)
          ========================================= */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col shadow-2xl md:shadow-sm z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Cabecera del Menú */}
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Gibbor Logo" className="w-9 h-9 object-contain rounded-full shadow-sm" />
            <span className="text-xl font-black text-slate-800 tracking-tight">Gibbor App</span>
          </div>
          {/* Botón X para cerrar en móvil */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-red-500 p-1 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Enlaces de Navegación */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menu.map((item) => {
            const activo = pathname === item.path || (item.path !== '/director' && pathname.startsWith(item.path));
            return (
              <Link 
                href={item.path} 
                key={item.name}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activo
                    ? 'bg-orange-50 text-orange-600 font-bold shadow-sm border border-orange-100/50'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                }`}
              >
                <span className={activo ? 'opacity-100' : 'opacity-70'}>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Botón Salir */}
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={cerrarSesion}
            className="flex items-center gap-3 text-red-500 font-bold px-4 py-3 hover:bg-red-50 w-full rounded-xl transition-colors group"
          >
            <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-500 transition-colors" /> Salir
          </button>
        </div>
      </aside>

      {/* =========================================
          CONTENIDO PRINCIPAL
          ========================================= */}
      <main className="flex-1 overflow-y-auto bg-slate-50 pt-16 md:pt-0">
        {children}
      </main>
      
    </div>
  );
}