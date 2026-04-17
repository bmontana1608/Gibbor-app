'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader, LogOut, Menu, X, Home, Users, CreditCard, ClipboardCheck, Tags, BarChart, Briefcase, UserCheck, MessageSquare, Settings, Flame, Activity, Trophy, ArrowRightLeft, Zap, Calendar } from 'lucide-react';

export default function DirectorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Estado para controlar si el menú hamburguesa está abierto o cerrado
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // El Middleware ahora maneja la seguridad de forma instantánea en el servidor.
  const [verificando, setVerificando] = useState(false);


  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const menu = [
    { name: 'Inicio (Dashboard)', path: '/director', icon: <Home className="w-5 h-5" /> },
    { name: 'Miembros', path: '/director/miembros', icon: <Users className="w-5 h-5" /> },
    { name: 'Agenda', path: '/director/eventos', icon: <Calendar className="w-5 h-5" /> },
    { name: 'Cobranza', path: '/director/cobranza', icon: <CreditCard className="w-5 h-5" /> },
    { name: 'Nómina', path: '/director/nomina', icon: <Briefcase className="w-5 h-5" /> },
    { name: 'Asistencia', path: '/director/asistencia', icon: <ClipboardCheck className="w-5 h-5" /> },
    { name: 'Categorías', path: '/director/categorias', icon: <Tags className="w-5 h-5" /> },
    { name: 'Reportes', path: '/director/reportes', icon: <BarChart className="w-5 h-5" /> },
    { name: 'Asistente WA', path: '/director/configuracion/asistente-whatsapp', icon: <MessageSquare className="w-5 h-5 text-emerald-500" /> },
    { name: 'Ajustes del Club', path: '/director/configuracion', icon: <Settings className="w-5 h-5 text-orange-500" /> },
  ];

  const accesosRapidos = [
    { 
      name: 'Espacio Técnico', 
      desc: 'Panel de Entrenador',
      path: '/entrenador', 
      icon: <Activity className="w-5 h-5" />,
      color: 'bg-emerald-500'
    },
    { 
      name: 'Espacio Atleta', 
      desc: 'Panel de Jugador',
      path: '/futbolista', 
      icon: <Trophy className="w-5 h-5" />,
      color: 'bg-orange-500'
    },
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

          <div className="p-4 mt-2 mx-4 mb-4 bg-slate-900 rounded-[1.5rem] border border-slate-800 shadow-xl shadow-slate-900/10 relative overflow-hidden">
            <div className="absolute right-[-10px] top-[-10px] opacity-10">
              <Zap className="w-20 h-20 text-white" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 relative z-10 flex items-center gap-2">
               <ArrowRightLeft className="w-3 h-3" /> Espacios de Trabajo
            </p>
            <div className="space-y-2 relative z-10">
            {accesosRapidos.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-xl transition-all duration-300 group"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.color} text-white shadow-lg`}>
                  <span className="group-hover:scale-110 transition-transform">{item.icon}</span>
                </div>
                <div>
                   <p className="font-bold text-white text-xs leading-none group-hover:text-amber-400 transition-colors">{item.name}</p>
                   <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-widest">{item.desc}</p>
                </div>
              </Link>
            ))}
            </div>
          </div>
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