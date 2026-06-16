'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/hooks/useTenant';
import { ClipboardList, CheckCircle, Clock, Calendar as CalIcon, Users, UserCheck, Trash2, X, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function ConvocatoriasDirector() {
  const { slug: tenantSlug } = useTenant();
  const [tenant, setTenant] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [notificandoJugador, setNotificandoJugador] = useState<string | null>(null);

  useEffect(() => {
    async function cargarEventos() {
      if (!tenantSlug) return;
      
      let currentTenant = tenant;
      if (!currentTenant) {
        const resT = await fetch(`/api/tenant?slug=${tenantSlug}`);
        currentTenant = await resT.json();
        setTenant(currentTenant);
      }
      
      if (!currentTenant) return;

      try {
        const res = await fetch(`/api/director/convocatorias?slug=${tenantSlug}`);
        if (res.ok) {
          const data = await res.json();
          setEventos(data);
        } else {
          console.error("Error fetching convocatorias from API");
        }
      } catch (err) {
        console.error("Error de red fetching convocatorias:", err);
      }
      setCargando(false);
    }
    cargarEventos();
  }, [tenant]);

  const aprobarEvento = async (eventoId: string) => {
    const toastId = toast.loading('Aprobando y enviando mensajes de WhatsApp...');
    try {
      const res = await fetch('/api/director/aprobar-convocatoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evento_id: eventoId, club_slug: tenantSlug })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      toast.success(data.mensaje || 'Convocatoria aprobada con éxito', { id: toastId });
      
      // Actualizar estado local
      setEventos(prev => prev.map(ev => ev.id === eventoId ? { ...ev, estado: 'Aprobado' } : ev));
    } catch (err: any) {
      toast.error('Error: ' + err.message, { id: toastId });
    }
  };

  const devolverEvento = async (eventoId: string) => {
    if (!confirm('¿Estás seguro de devolver esta lista al entrenador para modificaciones?')) return;
    const toastId = toast.loading('Devolviendo...');
    try {
      const res = await fetch('/api/director/devolver-convocatoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evento_id: eventoId, club_slug: tenantSlug })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      toast.success(data.mensaje || 'Convocatoria devuelta', { id: toastId });
      setEventos(prev => prev.map(ev => ev.id === eventoId ? { ...ev, estado: 'Devuelta' } : ev));
    } catch (err: any) {
      toast.error('Error: ' + err.message, { id: toastId });
    }
  };

  const eliminarEvento = async (eventoId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar y rechazar toda esta convocatoria?')) return;
    const toastId = toast.loading('Eliminando...');
    try {
      const res = await fetch(`/api/eventos?slug=${tenantSlug}&id=${eventoId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Convocatoria eliminada', { id: toastId });
        setEventos(prev => prev.filter(e => e.id !== eventoId));
      } else {
        toast.error(data.error || 'Error al eliminar', { id: toastId });
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message, { id: toastId });
    }
  };

  const eliminarJugador = async (convocatoriaId: string, eventoId: string) => {
    if (!confirm('¿Estás seguro de que deseas quitar a este jugador de la lista?')) return;
    const toastId = toast.loading('Quitando jugador...');
    try {
      const res = await fetch(`/api/director/convocatorias/jugador?slug=${tenantSlug}&id=${convocatoriaId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Jugador removido', { id: toastId });
        setEventos(prev => prev.map(e => {
          if (e.id === eventoId) {
            const nuevasConvs = e.convocatorias?.filter((c: any) => c.id !== convocatoriaId) || [];
            return { ...e, convocatorias: nuevasConvs };
          }
          return e;
        }).filter(e => e.convocatorias && e.convocatorias.length > 0)); 
      } else {
        toast.error(data.error || 'Error al remover jugador', { id: toastId });
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message, { id: toastId });
    }
  };

  const notificarJugador = async (convocatoriaId: string, eventoId: string) => {
    setNotificandoJugador(convocatoriaId);
    const toastId = toast.loading('Enviando WhatsApp al jugador...');
    try {
      const res = await fetch('/api/director/notificar-jugador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evento_id: eventoId, convocado_id: convocatoriaId, club_slug: tenantSlug })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Mensaje enviado por WhatsApp', { id: toastId });
        setEventos(prev => prev.map(e => {
          if (e.id === eventoId) {
            const nuevasConvs = e.convocatorias?.map((c: any) => 
              c.id === convocatoriaId ? { ...c, estado_notificacion: 'Enviada' } : c
            ) || [];
            return { ...e, convocatorias: nuevasConvs };
          }
          return e;
        }));
      } else {
        toast.error(data.error || 'Error al enviar mensaje', { id: toastId });
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message, { id: toastId });
    } finally {
      setNotificandoJugador(null);
    }
  };

  if (cargando) return <div className="p-8 text-center text-slate-400">Cargando convocatorias...</div>;

  const brandColor = tenant?.config?.color || tenant?.color_primario || '#06b6d4';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="mb-8 border-b pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-3">
            <ClipboardList className="w-8 h-8" style={{ color: brandColor }} />
            Gestión de Convocatorias
          </h1>
          <p className="text-slate-500 font-medium">Revisa y aprueba las nóminas enviadas por tus entrenadores.</p>
        </div>
      </div>

      <div className="space-y-6">
        {eventos.length === 0 && (
          <div className="text-center p-12 bg-white rounded-[2rem] border border-slate-100">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">No hay convocatorias registradas.</p>
          </div>
        )}

        {eventos.map(evento => (
          <div key={evento.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 overflow-hidden relative">
            {/* Banner de Estado */}
            <div className={`absolute top-0 left-0 w-2 h-full ${evento.estado === 'Aprobado' ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>

            <div className="flex flex-col md:flex-row justify-between items-start gap-6 ml-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${evento.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-600' : evento.estado === 'Devuelta' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                    {evento.estado}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{evento.tipo}</span>
                </div>
                
                <h2 className="text-2xl font-black text-slate-800 italic uppercase tracking-tighter">{evento.titulo}</h2>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500 font-medium">
                  <span className="flex items-center gap-1"><CalIcon className="w-4 h-4" /> {new Date(evento.fecha).toLocaleString()}</span>
                  <span className="flex items-center gap-1">🏟️ {evento.lugar || 'Por definir'}</span>
                  <span className="flex items-center gap-1">👤 Prof: {evento.perfiles?.nombres}</span>
                </div>
              </div>

              {evento.estado === 'Pendiente' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => devolverEvento(evento.id)}
                    className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-4 px-4 rounded-xl flex flex-col items-center justify-center transition-colors border border-rose-200"
                  >
                    <X className="w-6 h-6 mb-1" />
                    <span className="text-xs">Devolver Lista</span>
                  </button>
                  <button
                    onClick={() => aprobarEvento(evento.id)}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 px-4 rounded-xl flex flex-col items-center justify-center shadow-lg shadow-emerald-200 transition-colors"
                  >
                    <CheckCircle className="w-6 h-6 mb-1" />
                    <span className="text-xs">Aprobar y Notificar</span>
                  </button>
                </div>
              )}
              {evento.estado === 'Devuelta' && (
                <div className="text-center p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 font-bold text-sm">
                  Lista devuelta al entrenador para correcciones.
                </div>
              )}
              {evento.estado === 'Aprobado' && (
                <div className="flex flex-col gap-2">
                  <div className="text-center p-4 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200 font-bold text-sm">
                    Convocatoria Aprobada
                  </div>
                  <button
                    onClick={() => devolverEvento(evento.id)}
                    className="w-full bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-amber-200"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-widest">Reabrir para Modificaciones</span>
                  </button>
                </div>
              )}
            </div>

            <div className="mt-8 ml-4 border-t border-slate-50 pt-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" /> Nómina Convocada ({evento.convocatorias?.length || 0})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {evento.convocatorias?.map((convocado: any) => (
                  <div key={convocado.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 relative group">
                     <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-white border overflow-hidden">
                        {convocado.perfiles?.foto_url ? (
                          <img src={convocado.perfiles.foto_url} alt="foto" className="w-full h-full object-cover" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 text-xs truncate pr-6">{convocado.perfiles?.nombres} {convocado.perfiles?.apellidos}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${convocado.rol_partido === 'Titular' ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {convocado.rol_partido}
                        </p>
                      </div>
                      
                      {evento.estado === 'Pendiente' && (
                        <button
                          onClick={() => eliminarJugador(convocado.id, evento.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-slate-200 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all"
                          title="Remover de la convocatoria"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      
                      {evento.estado === 'Aprobado' && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {convocado.estado_notificacion === 'Enviada' && (
                            <span className="text-[8px] font-black uppercase text-emerald-500 mr-1 bg-emerald-50 px-1.5 py-0.5 rounded">Enviado</span>
                          )}
                          <button
                            onClick={() => notificarJugador(convocado.id, evento.id)}
                            disabled={notificandoJugador === convocado.id}
                            className={`p-2 rounded-lg shadow-sm border transition-all ${convocado.estado_notificacion === 'Enviada' ? 'text-slate-400 hover:text-indigo-500 bg-white border-slate-200' : 'text-white bg-indigo-500 hover:bg-indigo-600 border-indigo-600'}`}
                            title="Notificar por WhatsApp manualmente"
                          >
                            {notificandoJugador === convocado.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
