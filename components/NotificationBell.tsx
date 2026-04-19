'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function NotificationBell() {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  const cargarNotificaciones = async () => {
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombres, apellidos, created_at, rol')
      .eq('estado_miembro', 'Pendiente')
      .order('created_at', { ascending: false });

    if (!error) {
      setNotificaciones(data || []);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarNotificaciones();

    // SUSCRIPCIÓN EN TIEMPO REAL: Facebook Style
    const channel = supabase
      .channel('cambios-miembros')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'perfiles' },
        (payload) => {
          if (payload.new.estado_miembro === 'Pendiente') {
            setNotificaciones((prev) => [payload.new, ...prev]);
            toast.info(`¡Nueva solicitud! ${payload.new.nombres} se acaba de registrar.`, {
              icon: <UserPlus className="text-orange-500" />,
              action: {
                label: 'Ver',
                onClick: () => router.push('/director/miembros')
              }
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'perfiles' },
        (payload) => {
          // Si el miembro dejó de estar pendiente (fue aprobado/rechazado)
          if (payload.new.estado_miembro !== 'Pendiente') {
            setNotificaciones((prev) => prev.filter(n => n.id !== payload.new.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const total = notificaciones.length;

  return (
    <div className="relative">
      {/* Icono de Campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-xl transition-all"
      >
        <Bell className={`w-6 h-6 ${total > 0 ? 'animate-none' : ''}`} />
        {total > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-bounce">
            {total}
          </span>
        )}
      </button>

      {/* Menú Desplegable (Dropdown) */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Notificaciones</h3>
              <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {total} nuevas
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {cargando ? (
                <div className="p-10 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
                </div>
              ) : notificaciones.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-slate-200" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">No hay solicitudes pendientes</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {notificaciones.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => {
                        router.push('/director/miembros');
                        setIsOpen(false);
                      }}
                      className="w-full p-4 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0 text-orange-600 group-hover:scale-110 transition-transform">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                          {notif.nombres} {notif.apellidos}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                          Nueva solicitud: {notif.rol || 'Futbolista'}
                        </p>
                        <p className="text-[9px] text-orange-500 font-bold mt-1">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                router.push('/director/miembros');
                setIsOpen(false);
              }}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2"
            >
              Ver todas las solicitudes <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
