import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { LogOut, Home, PieChart, Users, DollarSign, Wallet, Target, MessageSquare } from 'lucide-react';
import MCMLogo from '@/components/MCMLogo';
import CampanitaNotificaciones from './CampanitaNotificaciones';
import SidebarNav from './SidebarNav';

export default async function EmbajadorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/login');
  }

  // Verificar que el usuario tenga rol de embajador o super admin
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (!perfil || (perfil.rol !== 'Embajador' && perfil.rol !== 'SuperAdmin')) {
    return redirect('/master'); // O redireccionar a un no-autorizado
  }

  const isSuperAdmin = perfil.rol === 'SuperAdmin';

  // Cargar datos del embajador (solo si no es SuperAdmin)
  let embajador = null;
  if (!isSuperAdmin) {
    const { data } = await supabase
      .from('embajadores')
      .select('id, nombre_completo, codigo_referido')
      .eq('user_id', user.id)
      .single();
    embajador = data;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex h-screen sticky top-0">
        <div className="p-6 border-b border-slate-800">
          <MCMLogo width={140} height={36} />
          <div className="mt-6 flex flex-col">
            <span className="text-xs font-black uppercase tracking-widest text-green-500 mb-1">
              {isSuperAdmin ? 'Soporte Administrativo' : 'Panel de Embajador'}
            </span>
            <span className="text-white font-bold truncate">
              {isSuperAdmin ? 'SuperAdmin' : (embajador?.nombre_completo || 'Embajador')}
            </span>
          </div>
        </div>

        <SidebarNav isSuperAdmin={isSuperAdmin} />

        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <form action="/api/auth/signout" method="post" className="flex-1">
            <button className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-slate-800 hover:text-white rounded-xl font-bold transition-colors">
              <LogOut className="w-5 h-5" /> Cerrar sesión
            </button>
          </form>
          <CampanitaNotificaciones embajadorId={embajador?.id} />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-x-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 p-4 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-green-500 mb-1">Embajador MCM</span>
          <div className="flex items-center gap-2">
            <CampanitaNotificaciones embajadorId={embajador?.id} />
            <form action="/api/auth/signout" method="post">
              <button className="p-2 text-slate-400">
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
