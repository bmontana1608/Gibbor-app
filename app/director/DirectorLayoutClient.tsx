'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import PushPermissionBanner from "@/components/PushPermissionBanner";
import { Loader, LogOut, Menu, X, Home, Users, CreditCard, ClipboardCheck, Tags, BarChart, Briefcase, UserCheck, MessageSquare, Settings, Flame, Activity, Trophy, ArrowRightLeft, Zap, Calendar, User, ShieldCheck, Megaphone, Bot, Shirt, Coins } from 'lucide-react';

interface DirectorLayoutClientProps {
  children: React.ReactNode;
  initialTenant: any;
  initialProfile: any;
}

export default function DirectorLayoutClient({ children, initialTenant, initialProfile }: DirectorLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const tenantSlug = initialTenant?.slug || '';
  const [basePath, setBasePath] = useState(tenantSlug && tenantSlug !== 'master' ? `/${tenantSlug}` : '');
  
  const tenant = initialTenant;
  const profile = initialProfile;

  // Cerrar menú al navegar
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Sincronizar basePath solo cuando cambia el club
  useEffect(() => {
    const isSubdomain = typeof window !== 'undefined' && window.location.host.startsWith(`${tenantSlug}.`);
    const computedBasePath = isSubdomain || !tenantSlug || tenantSlug === 'master' ? '' : `/${tenantSlug}`;
    if (computedBasePath !== basePath) {
      setBasePath(computedBasePath);
    }
  }, [tenantSlug]);


  const menu = useMemo(() => [
    { name: 'Inicio (Dashboard)', path: `${basePath}/director`, icon: <Home className="w-5 h-5" /> },
    { name: 'Miembros', path: `${basePath}/director/miembros`, icon: <Users className="w-5 h-5" /> },
    { name: 'Agenda', path: `${basePath}/director/eventos`, icon: <Calendar className="w-5 h-5" /> },
    { name: 'Cobranza', path: `${basePath}/director/cobranza`, icon: <CreditCard className="w-5 h-5" /> },
    { name: 'Aportes', path: `${basePath}/director/aportes`, icon: <Coins className="w-5 h-5" /> },
    { name: 'Nómina', path: `${basePath}/director/nomina`, icon: <Briefcase className="w-5 h-5" /> },
    { name: 'Asistencia', path: `${basePath}/director/asistencia`, icon: <ClipboardCheck className="w-5 h-5" /> },
    { name: 'Categorías', path: `${basePath}/director/categorias`, icon: <Tags className="w-5 h-5" /> },
    { name: 'Reportes', path: `${basePath}/director/reportes`, icon: <BarChart className="w-5 h-5" /> },
    { name: 'Comunicados', path: `${basePath}/director/comunicados`, icon: <Megaphone className="w-5 h-5" /> },
    { name: 'Historial WA', path: `${basePath}/director/whatsapp`, icon: <MessageSquare className="w-5 h-5" /> },
    { name: 'Asistente WA', path: `${basePath}/director/configuracion/asistente-whatsapp`, icon: <Bot className="w-5 h-5" /> },
    { name: 'Uniformes', path: `${basePath}/director/uniformes`, icon: <Shirt className="w-5 h-5" /> },
    { name: 'Ajustes del Club', path: `${basePath}/director/configuracion`, icon: <Settings className="w-5 h-5" /> },
  ], [basePath]);

  const accesosRapidos = useMemo(() => [
    { 
      name: 'Espacio Técnico', 
      desc: 'Panel de Entrenador',
      path: `${basePath}/entrenador`, 
      icon: <Activity className="w-5 h-5" />,
      color: 'bg-emerald-500'
    },
    { 
      name: 'Espacio Atleta', 
      desc: 'Panel de Jugador',
      path: `${basePath}/futbolista`, 
      icon: <Trophy className="w-5 h-5" />,
      color: 'bg-brand'
    },
  ], [basePath]);

  const brandName = tenant?.config?.nombre || 'Plataforma';
  const brandLogo = tenant?.config?.logo || '/logo.png';
  const brandColor = tenant?.config?.color || '#ea580c';

  const hexToRgb = (hex: string) => {
    try {
      const h = hex.startsWith('#') ? hex : `#${hex}`;
      const r = parseInt(h.slice(1, 3), 16);
      const g = parseInt(h.slice(3, 5), 16);
      const b = parseInt(h.slice(5, 7), 16);
      return isNaN(r) || isNaN(g) || isNaN(b) ? '234, 88, 12' : `${r}, ${g}, ${b}`;
    } catch (e) {
      return '234, 88, 12'; // Fallback Orange
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push(`${basePath}/login`);
  };


  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden transition-colors duration-300">
      <PushPermissionBanner />
      
      {/* Overlay para móvil */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 md:hidden transition-opacity" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl md:shadow-sm z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {initialTenant?.config?.logo ? (
              <img src={brandLogo} alt={`${brandName} Logo`} className="w-9 h-9 object-contain rounded-full shadow-sm" />
            ) : (
              <div className="w-9 h-9 bg-brand/10 rounded-full flex items-center justify-center border border-brand/20 shadow-sm">
                <ShieldCheck className="w-5 h-5 text-brand" />
              </div>
            )}
            <span className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{brandName}</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-red-500 p-1 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menu.map((item) => {
            const activo = pathname === item.path || (item.path.endsWith('/director') ? pathname === item.path : pathname.startsWith(item.path));
            return (
              <Link 
                href={item.path} 
                key={item.name}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  activo
                    ? 'bg-brand-muted text-brand font-bold shadow-sm border border-brand/10'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 font-medium'
                }`}
              >
                <span className={activo ? 'text-brand opacity-100' : 'opacity-70'}>{item.icon}</span>
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}

          <div className="p-4 mt-2 mx-2 mb-4 bg-slate-900 rounded-[1.5rem] border border-slate-800 shadow-xl shadow-slate-900/10 relative overflow-hidden">
            <div className="absolute right-[-10px] top-[-10px] opacity-10">
              <Zap className="w-20 h-20 text-white" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 relative z-10 flex items-center gap-2">
               <ArrowRightLeft className="w-3 h-3" /> Espacios
            </p>
            <div className="space-y-2 relative z-10">
            {accesosRapidos.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-xl transition-all duration-300 group"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.color} text-white shadow-lg`}>
                  <span className="group-hover:scale-110 transition-transform scale-90">{item.icon}</span>
                </div>
                <div>
                    <p className="font-bold text-white text-[11px] leading-none group-hover:text-brand transition-colors">{item.name}</p>
                </div>
              </Link>
            ))}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={cerrarSesion}
            className="flex items-center gap-3 text-red-500 font-bold px-4 py-3 hover:bg-red-50 dark:hover:bg-red-500/10 w-full rounded-xl transition-colors group"
          >
            <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-500 transition-colors" /> Salir
          </button>
        </div>
      </aside>


      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        <header className="h-16 flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 flex items-center justify-between px-4 md:px-6 transition-colors">
          <div className="md:hidden flex items-center gap-2">
            {tenant?.config?.logo ? (
              <img src={brandLogo} alt="Logo" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center border border-brand/20">
                <ShieldCheck className="w-4 h-4 text-brand" />
              </div>
            )}
            <span className="font-black text-slate-800 dark:text-white tracking-tighter uppercase">{brandName.split(' ')[0]}</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-brand" /> Área de Dirección
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <NotificationBell clubId={tenant?.id} />
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
            <ThemeToggle />
            <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-brand-muted flex items-center justify-center border border-brand/20">
                <User className="w-4 h-4 text-brand" />
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-brand"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
          {children}
        </main>
      </div>
      
    </div>
  );
}
