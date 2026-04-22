'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, UserPlus, ArrowRight, Loader2, Megaphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function NotificationBell({ clubId }: { clubId?: string }) {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [rolUsuario, setRolUsuario] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  const cargarNotificaciones = async (rol: string) => {
    // Si no hay clubId y no es un usuario maestro, no podemos cargar nada relevante del club
    if (!clubId && rol !== 'SuperAdmin') {
      setCargando(false);
      return;
    }

    let todas: any[] = [];

    // 1. Cargar Comunicados (Filtrados por club o globales)
    const queryComunicados = supabase
      .from('notificaciones_app')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (clubId) {
      queryComunicados.or(`club_id.eq.${clubId},club_id.is.null`);
    }

    const { data: comunicados } = await queryComunicados;
    if (comunicados) todas = [...todas, ...comunicados.map(c => ({ ...c, origen: 'comunicado' }))];

    // 2. Si es Director, cargar solicitudes pendientes DE SU CLUB
    if (rol === 'Director' && clubId) {
      const { data: pendientes } = await supabase
        .from('perfiles')
        .select('id, nombres, apellidos, created_at, rol')
        .eq('club_id', clubId)
        .eq('estado_miembro', 'Pendiente')
        .order('created_at', { ascending: false });
      
      if (pendientes) todas = [...todas, ...pendientes.map(p => ({ ...p, origen: 'registro', titulo: 'Nueva Solicitud', mensaje: `${p.nombres} ${p.apellidos} quiere unirse.` }))];
    }

    todas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setNotificaciones(todas);
    setCargando(false);
  };

  useEffect(() => {
    async function iniciar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
      const rol = perfil?.rol || 'Atleta';
      setRolUsuario(rol);
      await cargarNotificaciones(rol);
    }
    iniciar();
  }, [clubId]); // Recargar si el club cambia

  const total = notificaciones.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-xl transition-all"
      >
        <Bell className="w-6 h-6" />
        {total > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-bounce">
            {total}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
            
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white italic">Centro de Alertas</h3>
              <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full text-[10px] font-bold italic">
                {total} mensajes
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {cargando ? (
                <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>
              ) : notificaciones.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-slate-200" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium italic">Bandeja de entrada vacía</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {notificaciones.map((notif, index) => (
                    <div
                      key={notif.id || index}
                      onClick={() => { if(notif.origen === 'registro') router.push('/director/miembros'); setIsOpen(false); }}
                      className="w-full p-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group relative cursor-pointer"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.origen === 'registro' ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-600' : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600'}`}>
                        {notif.origen === 'registro' ? <UserPlus className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate uppercase italic tracking-tighter">
                          {notif.titulo || 'Aviso Gibbor'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-0.5">
                          {notif.mensaje}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {rolUsuario === 'Director' && (
              <button
                onClick={() => { router.push('/director/comunicados'); setIsOpen(false); }}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-colors border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2"
              >
                Enviar nuevo comunicado <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
