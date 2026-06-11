'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/hooks/useTenant';
import { ClipboardList, CheckCircle, Clock, Calendar as CalIcon, Users, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ConvocatoriasDirector() {
  const { slug: tenantSlug } = useTenant();
  const [tenant, setTenant] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

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

      const { data, error } = await supabase
        .from('eventos')
        .select(`
          *,
          perfiles!eventos_creado_por_fkey (nombres, apellidos),
          convocatorias (
            id,
            rol_partido,
            estado_notificacion,
            perfiles!convocatorias_jugador_id_fkey (nombres, apellidos, foto_url, posicion)
          )
        `)
        .eq('club_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching eventos:", error.message);
      } else if (data) {
        // Filtrar solo eventos que tengan convocatorias
        const eventosConConvocatorias = data.filter(e => e.convocatorias && e.convocatorias.length > 0);
        setEventos(eventosConConvocatorias);
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
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${evento.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
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
                <button 
                  onClick={() => aprobarEvento(evento.id)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2 flex-shrink-0"
                >
                  <CheckCircle className="w-4 h-4" /> Aprobar y Notificar WPP
                </button>
              )}
            </div>

            <div className="mt-8 ml-4 border-t border-slate-50 pt-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" /> Nómina Convocada ({evento.convocatorias?.length || 0})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {evento.convocatorias?.map((convocado: any) => (
                  <div key={convocado.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                     <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-white border overflow-hidden">
                        {convocado.perfiles?.foto_url ? (
                          <img src={convocado.perfiles.foto_url} alt="foto" className="w-full h-full object-cover" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 text-xs truncate">{convocado.perfiles?.nombres} {convocado.perfiles?.apellidos}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${convocado.rol_partido === 'Titular' ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {convocado.rol_partido}
                        </p>
                      </div>
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
