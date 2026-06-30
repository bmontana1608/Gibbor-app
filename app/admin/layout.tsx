'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Building2, Users, CreditCard, TrendingUp, Library, LifeBuoy, 
  Megaphone, History, User, Settings, LogOut, Loader2, FileText, Image as ImageIcon, Rocket 
} from 'lucide-react';
import { toast } from 'sonner';
import MCMLogo from '@/components/MCMLogo';
import LoginForm from '@/components/LoginForm';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') checkAuth();
      if (event === 'SIGNED_OUT' && !session) setIsAdmin(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsAdmin(false); return; }
    
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
    if (perfil?.rol?.toLowerCase() !== 'superadmin') { setIsAdmin(false); return; }
    
    setIsAdmin(true);
  };

  const navItems = [
    { id: 'solicitudes', icon: <FileText size={20} />, label: 'Solicitudes', path: '/admin/solicitudes' },
    { id: 'clubes', icon: <Building2 size={20} />, label: 'Clubes', path: '/admin/clubes' },
    { id: 'crm', icon: <Rocket size={20} />, label: 'CRM', path: '/admin/crm' },
    { id: 'usuarios', icon: <Users size={20} />, label: 'Usuarios', path: '/admin/usuarios' },
    { id: 'planes', icon: <CreditCard size={20} />, label: 'Planes', path: '/admin/planes' },
    { id: 'metricas', icon: <TrendingUp size={20} />, label: 'Métricas', path: '/admin/metricas' },
    { id: 'biblioteca', icon: <Library size={20} />, label: 'Biblioteca', path: '/admin/biblioteca' },
    { id: 'tickets', icon: <LifeBuoy size={20} />, label: 'Tickets', path: '/admin/tickets' },
    { id: 'comunicacion', icon: <Megaphone size={20} />, label: 'Anuncios', path: '/admin/comunicacion' },
    { id: 'publicidad', icon: <ImageIcon size={20} />, label: 'Publicidad', path: '/admin/publicidad' },
    { id: 'auditoria', icon: <History size={20} />, label: 'Auditoría', path: '/admin/auditoria' },
  ];

  const adminTenant = {
    config: { nombre: 'Master Club Manager', color: '#84cc16', logo: '/mcm-logo.png' }
  };

  if (isAdmin === false) return <LoginForm tenant={adminTenant} />;
  if (isAdmin === null) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-lime-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans flex">
      {/* ── SIDEBAR (Desktop) ── */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6 hidden md:flex flex-col z-50 shadow-sm">
        <div className="mb-8">
          <MCMLogo width={180} height={48} variant="dark" />
          <p className="text-xs text-gray-400 font-semibold mt-3 ml-1">Panel SuperAdmin</p>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto hide-scrollbar">
          {navItems.map(item => (
            <Link 
              href={item.path} 
              key={item.id}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
                pathname === item.path 
                  ? 'bg-lime-50 text-lime-700' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className={pathname === item.path ? 'text-lime-500' : 'text-gray-400'}>{item.icon}</div>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-100 pt-4 space-y-1 mt-4">
          <Link 
            href="/admin/mi-cuenta"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
              pathname === '/admin/mi-cuenta' ? 'bg-lime-50 text-lime-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className={pathname === '/admin/mi-cuenta' ? 'text-lime-500' : 'text-gray-400'}><User size={18} /></div>
            Mi Cuenta
          </Link>
          
          <Link 
            href="/admin/configuracion"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
              pathname === '/admin/configuracion' ? 'bg-lime-50 text-lime-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className={pathname === '/admin/configuracion' ? 'text-lime-500' : 'text-gray-400'}><Settings size={18} /></div>
            Configuración
          </Link>
          
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success('Sesión cerrada');
              setIsAdmin(false);
              router.push('/login');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all group text-left mt-2"
          >
            <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="text-sm font-semibold">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── TOPBAR (Mobile) ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <MCMLogo width={140} height={38} variant="dark" />
        <button
          onClick={async () => { await supabase.auth.signOut(); setIsAdmin(false); router.push('/login'); }}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* ── BOTTOM NAV (Mobile) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-center overflow-x-auto px-4 py-2 shadow-lg gap-6 hide-scrollbar">
        {navItems.map(item => (
          <Link
            key={item.id}
            href={item.path}
            className={`flex flex-col items-center flex-shrink-0 gap-1 px-2 py-1 rounded-xl transition-all ${pathname === item.path ? 'text-lime-600' : 'text-gray-400'}`}
          >
            {item.icon}
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        ))}
        <Link
          href="/admin/mi-cuenta"
          className={`flex flex-col items-center flex-shrink-0 gap-1 px-2 py-1 rounded-xl transition-all ${pathname === '/admin/mi-cuenta' ? 'text-lime-600' : 'text-gray-400'}`}
        >
          <User size={20} />
          <span className="text-[10px] font-bold">Cuenta</span>
        </Link>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 md:ml-64 pt-20 md:pt-0 pb-24 md:pb-0 p-4 md:p-8 overflow-x-hidden min-h-screen">
        {children}
      </main>
    </div>
  );
}
