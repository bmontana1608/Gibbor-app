'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader, LogOut, Menu, X, Home, Users, ClipboardCheck, BarChart, Shield, Layout, Trophy, Radar, ArrowRightLeft, Zap } from 'lucide-react';
import PushPermissionBanner from "@/components/PushPermissionBanner";

interface EntrenadorLayoutClientProps {
  children: React.ReactNode;
  initialTenant: any;
  initialProfile: any;
}

export default function EntrenadorLayoutClient({ children, initialTenant, initialProfile }: EntrenadorLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tenant] = useState<any>(initialTenant);
  const [usuario] = useState<any>(initialProfile);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push(`/${tenant?.slug || 'default'}/login`);
  };

  const tenantSlug = tenant?.slug || '';
  const [isSubdomain, setIsSubdomain] = useState(false);

  useEffect(() => {
    const host = typeof window !== 'undefined' ? window.location.host : '';
    if (host.startsWith(`${tenantSlug}.`)) {
      setIsSubdomain(true);
    }
  }, [tenantSlug]);

  const basePath = isSubdomain || !tenantSlug || tenantSlug === 'master' ? '' : `/${tenantSlug}`;

  const menu = [
    { name: 'Inicio', path: `${basePath}/entrenador`, icon: <Home className="w-5 h-5" /> },
    { name: 'Pasar Asistencia', path: `${basePath}/entrenador/asistencia`, icon: <ClipboardCheck className="w-5 h-5" /> },
    { name: 'Planificador', path: `${basePath}/entrenador/planificador`, icon: <Layout className="w-5 h-5" /> },
    { name: 'Puntos de Honor', path: `${basePath}/entrenador/puntos`, icon: <Trophy className="w-5 h-5" /> },
    { name: 'Stats Lab', path: `${basePath}/entrenador/stats`, icon: <Radar className="w-5 h-5" /> },
    { name: 'Mis Categorías', path: `${basePath}/entrenador/categorias`, icon: <Users className="w-5 h-5" /> },
    { name: 'Estadísticas', path: `${basePath}/entrenador/estadisticas`, icon: <BarChart className="w-5 h-5" /> },
  ];

  const brandName = tenant?.config?.nombre || tenant?.nombre || 'Club';
  const brandLogo = tenant?.config?.logo || tenant?.logo_url || '/logo.png';
  const brandColor = tenant?.config?.color || tenant?.color_primario || '#06b6d4';

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <PushPermissionBanner />
      
      {/* HEADER MÓVIL */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 z-30 flex items-center justify-between p-4 shadow-md">
        <div className="flex items-center gap-2">
          <img src={brandLogo} alt="Logo" className="w-8 h-8 object-contain rounded-full" />
          <span className="text-white font-black tracking-tighter uppercase italic text-sm">{brandName} Staff</span>
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
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img src={brandLogo} alt="Logo" className="w-9 h-9 object-contain rounded-full shadow-md" />
              <div>
                <span className="text-xl font-black text-slate-800 tracking-tighter uppercase italic leading-none block">{brandName}</span>
                <span className="text-[9px] font-black uppercase tracking-widest leading-none" style={{ color: brandColor }}>Staff Mode</span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 p-1">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3 mb-2 group transition-all">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border shrink-0 shadow-inner" style={{ backgroundColor: `${brandColor}10`, color: brandColor, borderColor: `${brandColor}20` }}>
              {usuario?.nombres?.charAt(0) || 'S'}
            </div>
            <div className="overflow-hidden">
              <p className="font-black text-slate-800 text-sm truncate uppercase italic tracking-tighter">
                {usuario?.nombres?.split(' ')[0] || 'Staff User'}
              </p>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mt-1">Entrenador</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
          {menu.map((item) => {
            const activo = pathname === item.path || (item.path.endsWith('/entrenador') ? pathname === item.path : pathname.startsWith(item.path));
            return (
              <Link 
                href={item.path} 
                key={item.name}
                prefetch={false}
                onClick={() => {
                  setIsSidebarOpen(false);
                  if (pathname === item.path) router.refresh();
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                  activo
                    ? 'text-white font-bold shadow-lg'
                    : 'text-slate-500 hover:bg-slate-50 font-semibold'
                }`}
                style={activo ? { backgroundColor: brandColor, boxShadow: `0 8px 20px -5px ${brandColor}60` } : {}}
              >
                <div className={`${activo ? 'text-white' : 'text-slate-400 group-hover:text-brand'} transition-colors`}>
                    {item.icon}
                </div>
                <span className={`text-sm tracking-tight ${activo ? 'italic uppercase tracking-tighter' : ''}`}>{item.name}</span>
              </Link>
            );
          })}

          <div className="p-4 mt-6 mx-2 bg-slate-900 rounded-[1.5rem] border border-slate-800 shadow-xl relative overflow-hidden">
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <ArrowRightLeft className="w-3 h-3" /> Otros Espacios
             </p>
             <div className="space-y-2">
                <Link 
                    href={`${basePath}/futbolista`}
                    className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-all group"
                >
                    <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white shadow-lg">
                        <Trophy className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-brand transition-colors">Modo Familia</span>
                </Link>

                {usuario?.rol === 'Director' && (
                    <Link 
                        href={`${basePath}/director`}
                        className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-all group"
                    >
                        <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center text-white shadow-lg">
                            <Shield className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">Panel Director</span>
                    </Link>
                )}
             </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
            <button 
                onClick={cerrarSesion} 
                className="w-full flex items-center gap-3 text-slate-400 hover:text-red-500 hover:bg-red-50 px-4 py-3 rounded-xl transition-all font-bold text-sm group"
            >
                <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> <span>Cerrar Sesión</span>
            </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50 pt-16 md:pt-0">
        <div className="p-4 md:p-8">
            {children}
        </div>
      </main>
    </div>
  );
}
