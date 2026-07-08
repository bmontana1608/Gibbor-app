'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/hooks/useTenant';
import { Play, Calendar, Trophy, Shield } from 'lucide-react';
import Link from 'next/link';

export default function FutbolistaPartidosLive() {
  const { slug: tenantSlug } = useTenant();
  const [eventos, setEventos] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  const basePath = tenantSlug && tenantSlug !== 'master' ? `/${tenantSlug}` : '';

  useEffect(() => {
    async function loadData() {
      if (!tenantSlug) return;
      const { data: tenantData } = await supabase.from('clubes').select('*').eq('slug', tenantSlug).single();
      if (!tenantData) return;
      setTenant(tenantData);

      const unMesAtras = new Date();
      unMesAtras.setMonth(unMesAtras.getMonth() - 1);

      const { data: ev } = await supabase
        .from('eventos')
        .select('*')
        .eq('club_id', tenantData.id)
        .order('fecha', { ascending: false })
        .limit(100);
      
      if (ev) {
        const filtered = ev.filter(e => {
          const isReciente = new Date(e.fecha) >= unMesAtras;
          const isActivo = ['1er Tiempo', '2do Tiempo', 'Descanso', 'En Juego', 'Prórroga', 'Penales'].includes(e.estado_partido);
          return isReciente || isActivo;
        });
        setEventos(filtered);
      }
      setCargando(false);
    }
    loadData();
  }, [tenantSlug]);

  if (cargando) return <div className="p-8 text-center text-slate-400">Cargando partidos...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <h1 className="text-3xl font-black text-slate-800 uppercase italic flex items-center gap-2">
        <Play className="w-8 h-8 text-emerald-500" />
        Partidos Live
      </h1>
      <p className="text-slate-500">Sigue el minuto a minuto de los partidos del club.</p>
      
      <div className="grid md:grid-cols-2 gap-4">
        {eventos.map((ev) => {
          const isLive = ['1er Tiempo', '2do Tiempo', 'Descanso'].includes(ev.estado_partido);
          const isFinished = ev.estado_partido === 'Finalizado';
          
          return (
            <Link 
              key={ev.id} 
              href={`${basePath}/futbolista/partidos/${ev.id}/en-vivo`}
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(ev.fecha).toLocaleDateString()}
                </span>
                {isLive && (
                  <span className="bg-red-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-full tracking-widest flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    LIVE
                  </span>
                )}
                {isFinished && (
                   <span className="bg-slate-200 text-slate-600 text-[10px] font-black uppercase px-2 py-1 rounded-full tracking-widest">
                     Finalizado
                   </span>
                )}
              </div>
              
              <div className="flex items-center justify-between gap-4 flex-1">
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center p-2 border border-slate-100">
                     <img src={tenant?.config?.logo || tenant?.logo_url || '/logo.png'} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-xs font-black uppercase text-center text-slate-700 leading-tight h-8">
                     {tenant?.config?.nombre_corto || 'Club'}
                  </span>
                </div>
                
                <div className="flex flex-col items-center justify-center">
                  {(isLive || isFinished) ? (
                    <div className="text-3xl font-black italic tracking-tighter text-slate-800">
                      {ev.es_local ? `${ev.marcador_local} - ${ev.marcador_visitante}` : `${ev.marcador_visitante} - ${ev.marcador_local}`}
                    </div>
                  ) : (
                    <div className="text-lg font-black italic tracking-tighter text-slate-400">VS</div>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center p-2 border border-slate-100">
                    {ev.escudo_rival_url ? (
                      <img src={ev.escudo_rival_url} className="w-full h-full object-contain" />
                    ) : (
                      <Shield className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <span className="text-xs font-black uppercase text-center text-slate-700 leading-tight h-8">
                     {ev.equipo_rival || 'Rival'}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      
      {eventos.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-200">
          <Play className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-800 uppercase italic">No hay partidos</h3>
          <p className="text-slate-500">Pronto habrán partidos disponibles.</p>
        </div>
      )}
    </div>
  );
}
