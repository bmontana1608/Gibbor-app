'use client';
import { Bell } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function CampanitaNotificaciones({ embajadorId }: { embajadorId?: string | null }) {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [abierto, setAbierto] = useState(false);
  const supabase = createClient();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!embajadorId) return;
    
    cargarNotificaciones();
    // Suscripción en tiempo real a nuevas notificaciones
    const channel = supabase.channel(`notificaciones_${embajadorId}_${Math.random()}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notificaciones_embajadores',
        filter: `embajador_id=eq.${embajadorId}`
      }, (payload) => {
        setNotificaciones(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [embajadorId]);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cargarNotificaciones = async () => {
    const { data } = await supabase
      .from('notificaciones_embajadores')
      .select('*')
      .eq('embajador_id', embajadorId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setNotificaciones(data);
  };

  const marcarLeidas = async () => {
    const noLeidas = notificaciones.filter(n => !n.leida).map(n => n.id);
    if (noLeidas.length > 0) {
      await supabase.from('notificaciones_embajadores').update({ leida: true }).in('id', noLeidas);
      setNotificaciones(notificaciones.map(n => ({ ...n, leida: true })));
    }
  };

  const toggleOpen = () => {
    if (!abierto) marcarLeidas();
    setAbierto(!abierto);
  };

  const noLeidasCount = notificaciones.filter(n => !n.leida).length;

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={toggleOpen}
        className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
      >
        <Bell className="w-6 h-6" />
        {noLeidasCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Notificaciones</h3>
            {noLeidasCount > 0 && <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{noLeidasCount} nuevas</span>}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No tienes notificaciones recientes.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notificaciones.map(n => (
                  <div key={n.id} className={`p-4 transition-colors ${!n.leida ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                    <p className={`text-sm ${!n.leida ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                      {n.mensaje}
                    </p>
                    <span className="text-xs text-slate-400 mt-2 block">
                      {new Date(n.created_at).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
