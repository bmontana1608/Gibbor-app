'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, LogOut, LayoutDashboard, ChevronRight, Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Props {
  children: React.ReactNode;
  holding: any;
  perfil: any;
}

export default function HoldingLayoutClient({ children, holding, perfil }: Props) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const brandColor = holding?.color_primario || '#10b981';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Nav */}
      <header
        className="sticky top-0 z-50 shadow-sm"
        style={{ backgroundColor: brandColor }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {holding?.logo_url ? (
              <img src={holding.logo_url} alt={holding.nombre} className="h-9 w-9 rounded-xl object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <p className="text-white font-black text-sm leading-tight">{holding?.nombre}</p>
              <p className="text-white/70 text-xs">Panel Holding · Vista Global</p>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/holding"
              className="flex items-center gap-2 text-white/90 hover:text-white text-sm font-semibold transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <div className="w-px h-5 bg-white/30" />
            <span className="text-white/80 text-sm">{perfil?.nombres || 'Propietario'}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-white p-1"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden px-4 pb-3 flex flex-col gap-2">
            <Link
              href="/holding"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 text-white/90 text-sm font-semibold py-2 border-t border-white/20"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-white/80 text-sm font-semibold py-2 border-t border-white/20"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
