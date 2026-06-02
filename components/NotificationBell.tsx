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
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  const router = useRouter();

  const cargarNotificaciones = async (rol: string, activeUserId: string) => {
    try {
      // Si no hay clubId y no es un usuario maestro, no podemos cargar nada relevante del club
      if (!clubId && rol !== 'SuperAdmin') {
        setCargando(false);
        return;
      }

      let todas: any[] = [];

      // 1. Cargar Comunicados (Filtrados por usuario o globales)
      let queryComunicados = supabase
        .from('notificaciones_app')
        .select('*');
      
      if (activeUserId) {
        queryComunicados = queryComunicados.or(`user_id.eq.${activeUserId},user_id.is.null`);
      }

      const { data: comunicados, error: errC } = await queryComunicados
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (errC) console.error("Error comunicados:", errC);
      if (comunicados) todas = [...todas, ...comunicados.map(c => ({ ...c, origen: 'comunicado' }))];

      // 2. Si es Director, cargar solicitudes pendientes DE SU CLUB (usando fecha_registro en lugar de created_at)
      if (rol === 'Director' && clubId) {
        const { data: pendientes, error: errP } = await supabase
          .from('perfiles')
          .select('id, nombres, apellidos, fecha_registro, rol')
          .eq('club_id', clubId)
          .eq('estado_miembro', 'Pendiente')
          .order('fecha_registro', { ascending: false });
        
        if (errP) console.error("Error pendientes:", errP);
        if (pendientes) {
          todas = [
            ...todas, 
            ...pendientes.map(p => ({ 
              ...p, 
              origen: 'registro', 
              titulo: 'Nueva Solicitud', 
              mensaje: `${p.nombres} ${p.apellidos} quiere unirse.` 
            }))
          ];
        }
      }

      todas.sort((a, b) => {
        const dateB = new Date(b.created_at || b.fecha_registro).getTime();
        const dateA = new Date(a.created_at || a.fecha_registro).getTime();
        return dateB - dateA;
      });
      setNotificaciones(todas);
    } catch (error) {
      console.error("Error cargando notificaciones:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    async function iniciar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
      const rol = perfil?.rol || 'Atleta';
      setRolUsuario(rol);
      await cargarNotificaciones(rol, user.id);
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
                      onClick={() => { 
                        if(notif.origen === 'registro') {
                          router.push('/director/miembros'); 
                        } else {
                          setSelectedNotif(notif);
                        }
                        setIsOpen(false); 
                      }}
                      className="w-full p-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group relative cursor-pointer"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.origen === 'registro' ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-600' : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600'}`}>
                        {notif.origen === 'registro' ? <UserPlus className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate uppercase italic tracking-tighter">
                          {notif.titulo || 'Nuevo Aviso'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-0.5 line-clamp-2">
                          {notif.mensaje}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase">
                          {new Date(notif.created_at || notif.fecha_registro || Date.now()).toLocaleDateString()}
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

      {selectedNotif && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
            <div className="flex items-start gap-4 mb-4">
               <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0">
                 <Megaphone className="w-6 h-6" />
               </div>
               <div>
                 <h2 className="text-lg font-black text-slate-800 dark:text-white leading-tight">{selectedNotif.titulo || 'Comunicado'}</h2>
                 <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                   {new Date(selectedNotif.created_at || selectedNotif.fecha_registro || Date.now()).toLocaleDateString()}
                 </p>
               </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-6">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {selectedNotif.mensaje}
              </p>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => setSelectedNotif(null)}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
