'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/hooks/useTenant';
import { Clock, Shield, ArrowRightLeft, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function FamiliaPartidoEnVivo({ params }: { params: { id: string } }) {
  const { slug: tenantSlug } = useTenant();
  const [tenant, setTenant] = useState<any>(null);
  const [evento, setEvento] = useState<any>(null);
  const [eventosMinuto, setEventosMinuto] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!tenantSlug) return;
      
      const { data: tenantData } = await supabase.from('clubes').select('*').eq('slug', tenantSlug).single();
      setTenant(tenantData);

      const { data: ev } = await supabase.from('eventos').select('*').eq('id', params.id).single();
      if (ev) setEvento(ev);

      await fetchEventosMinuto();
      setCargando(false);
    }
    loadData();
  }, [params.id, tenantSlug]);

  useEffect(() => {
    // Realtime listeners
    const channelMinuto = supabase.channel('familia_minuto_minuto')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos_minuto_minuto', filter: `evento_id=eq.${params.id}` }, () => {
        fetchEventosMinuto();
      })
      .subscribe();

    const channelEvento = supabase.channel('familia_evento')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'eventos', filter: `id=eq.${params.id}` }, (payload) => {
         setEvento((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelMinuto);
      supabase.removeChannel(channelEvento);
    };
  }, [params.id]);

  const fetchEventosMinuto = async () => {
    const { data } = await supabase.from('eventos_minuto_minuto')
        .select(`
          *,
          jugador:perfiles!eventos_minuto_minuto_jugador_id_fkey (nombres, apellidos, foto_url),
          jugador_sale:perfiles!eventos_minuto_minuto_jugador_sale_id_fkey (nombres, apellidos, foto_url)
        `)
        .eq('evento_id', params.id)
        .order('created_at', { ascending: false });
    if (data) setEventosMinuto(data);
  };

  if (cargando) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="text-center animate-pulse">
         <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mx-auto mb-4"></div>
         <p className="text-emerald-500 font-bold tracking-widest uppercase text-sm">Conectando al estadio...</p>
      </div>
    </div>
  );

  const brandColor = tenant?.config?.color || '#06b6d4';
  const basePath = tenantSlug && tenantSlug !== 'master' ? `/${tenantSlug}` : '';

  const getMarcador = () => {
    if (evento?.es_local === false) return `${evento?.marcador_visitante || 0} - ${evento?.marcador_local || 0}`;
    return `${evento?.marcador_local || 0} - ${evento?.marcador_visitante || 0}`;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-20">
      
      {/* Header Sticky Marcador */}
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href={`${basePath}/futbolista/partidos`} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
             <ArrowRightLeft className="w-5 h-5 rotate-180" />
          </Link>
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-widest font-black text-emerald-500 flex items-center gap-1.5 mb-1">
              {['1er Tiempo', '2do Tiempo', 'En Juego', 'Prórroga', 'Penales'].includes(evento?.estado_partido) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
              {evento?.estado_partido || 'En Vivo'}
            </span>
            <div className="text-2xl font-black italic tracking-tighter">{getMarcador()}</div>
          </div>
          <div className="w-10"></div> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-8">
        
        {/* Enfrentamiento */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden mb-12 border border-white/10">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at top right, ${brandColor}, transparent 50%)`}}></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex flex-col items-center gap-3 w-1/3">
              <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center p-3 backdrop-blur-md border border-white/20 shadow-xl">
                 {evento?.es_local ? (
                    <img src={tenant?.config?.logo || tenant?.logo_url || '/logo.png'} className="w-full h-full object-contain drop-shadow-lg" />
                 ) : (
                    <img src={evento?.escudo_rival_url || 'https://cdn-icons-png.flaticon.com/512/1162/1162815.png'} className="w-full h-full object-contain drop-shadow-lg" />
                 )}
              </div>
               <span className="font-black text-xs text-center uppercase tracking-widest text-slate-200 leading-tight">
                 {evento?.es_local ? tenant?.config?.nombre_corto : (evento?.equipo_rival || 'Rival')}
               </span>
            </div>

            <div className="w-1/3 flex flex-col items-center justify-center gap-1">
              {['1er Tiempo', '2do Tiempo', 'Descanso', 'En Juego', 'Prórroga', 'Penales', 'Finalizado'].includes(evento?.estado_partido) ? (
                <span className="text-5xl font-black italic text-white tracking-tighter">{getMarcador()}</span>
              ) : (
                <span className="text-5xl font-black italic text-white/20 tracking-tighter">VS</span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{evento?.estado_partido}</span>
            </div>

            <div className="flex flex-col items-center gap-3 w-1/3">
               <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center p-3 backdrop-blur-md border border-white/20 shadow-xl">
                 {evento?.es_local ? (
                    <img src={evento?.escudo_rival_url || 'https://cdn-icons-png.flaticon.com/512/1162/1162815.png'} className="w-full h-full object-contain drop-shadow-lg" />
                 ) : (
                    <img src={tenant?.config?.logo || tenant?.logo_url || '/logo.png'} className="w-full h-full object-contain drop-shadow-lg" />
                 )}
              </div>
               <span className="font-black text-xs text-center uppercase tracking-widest text-slate-200 leading-tight">
                 {evento?.es_local ? (evento?.equipo_rival || 'Rival') : tenant?.config?.nombre_corto}
               </span>
            </div>
          </div>
        </div>

        {/* Cancha Global de Acciones */}
        {eventosMinuto.some((e: any) => e.comentario?.includes('| pos:')) && (
          <div className="mb-12">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 px-2">
              <MapPin className="w-4 h-4" /> Mapa Táctico del Partido
            </h3>
            <div className="relative w-full aspect-[2/1] bg-emerald-600/20 border border-emerald-500/30 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
              {/* Líneas de la cancha */}
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20 -ml-[1px]" />
              <div className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-white/20 rounded-full -mt-8 -ml-8" />
              <div className="absolute top-1/2 left-0 w-12 h-24 border-2 border-white/20 -mt-12 -ml-[2px]" />
              <div className="absolute top-1/2 right-0 w-12 h-24 border-2 border-white/20 -mt-12 -mr-[2px]" />
              
              {/* Puntos (Acciones) */}
              {eventosMinuto.map((evm: any) => {
                if (!evm.comentario?.includes('| pos:')) return null;
                const rawPos = evm.comentario.split('| pos:')[1]?.trim();
                const [posX, posY] = rawPos ? rawPos.split(',').map(Number) : [null, null];
                if (posX === null || posY === null) return null;

                const isGol = evm.tipo_accion === 'Gol';
                const isTiro = evm.tipo_accion === 'Tiro al Arco';
                const isFalta = evm.tipo_accion === 'Falta';
                
                const dotColor = isGol ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,1)]' : 
                                 isTiro ? 'bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,1)]' : 
                                 isFalta ? 'bg-orange-400 shadow-[0_0_15px_rgba(251,146,60,1)]' : 
                                 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,1)]';

                return (
                  <div key={`pitch-${evm.id}`} className={`absolute w-3 h-3 rounded-full border-2 border-white/80 transition-all cursor-pointer group hover:scale-150 hover:z-50 ${dotColor}`}
                       style={{left: `${posX}%`, top: `${posY}%`, transform: 'translate(-50%, -50%)'}}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#020617] text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap pointer-events-none border border-white/10 shadow-xl transition-opacity">
                      {evm.minuto}' - {evm.tipo_accion}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Leyenda de la cancha */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 px-4">
               <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white/50"></div><span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Goles</span></div>
               <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-400 border border-white/50"></div><span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Tiros</span></div>
               <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-400 border border-white/50"></div><span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Faltas</span></div>
               <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-white/50"></div><span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Otros</span></div>
            </div>
          </div>
        )}

        {/* Timeline Rushbet Style */}
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 px-2">
          <Clock className="w-4 h-4" /> Minuto a Minuto
        </h3>

        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-8 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-white/20 before:via-white/10 before:to-transparent">
          {eventosMinuto.length === 0 ? (
            <div className="text-center py-10">
              {['1er Tiempo', '2do Tiempo', 'Descanso', 'En Juego', 'Prórroga', 'Penales'].includes(evento?.estado_partido) ? (
                <div className="flex flex-col items-center gap-3">
                  <span className="text-3xl">⚽</span>
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Partido en curso</p>
                  <p className="text-slate-600 text-xs">Los eventos del partido aparecerán aquí en tiempo real</p>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Esperando el inicio del partido...</p>
              )}
            </div>
          ) : (
            eventosMinuto.map((evm: any, index: number) => {
              const isGol = evm.tipo_accion === 'Gol';
              const isGolRival = evm.tipo_accion === 'Gol Contra';
              const isAmarilla = evm.tipo_accion === 'Tarjeta Amarilla';
              const isRoja = evm.tipo_accion === 'Tarjeta Roja';
              const isCambio = evm.tipo_accion === 'Cambio';
              const isTiro = evm.tipo_accion === 'Tiro al Arco';
              const isFalta = evm.tipo_accion === 'Falta';
              const isEsquina = evm.tipo_accion === 'Tiro de Esquina';
              
              const isEnContra = evm.comentario?.includes('(En Contra)') || isGolRival;
              const cleanComentario = evm.comentario?.replace('(En Contra)', '')?.split('| pos:')[0]?.trim();
              const rawPos = evm.comentario?.split('| pos:')[1]?.trim();
              const [posX, posY] = rawPos ? rawPos.split(',').map(Number) : [null, null];
              
              const isBadAction = isRoja || (isFalta && isEnContra) || isGolRival;

              return (
                <div key={evm.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  
                  {/* Icon Node */}
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#020617] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-xl z-10 
                    ${isGol ? 'bg-emerald-500 text-white' : 
                      isGolRival ? 'bg-slate-700 text-slate-300' :
                      isAmarilla ? 'bg-yellow-400 text-white' : 
                      isRoja ? 'bg-red-500 text-white' : 
                      isCambio ? 'bg-indigo-500 text-white' : 
                      isTiro ? 'bg-blue-500 text-white' :
                      isFalta ? 'bg-orange-500 text-white' :
                      isEsquina ? 'bg-purple-500 text-white' :
                      'bg-slate-800 text-slate-300'}`}
                  >
                    {isGol ? '⚽' : isGolRival ? '🥅' : isCambio ? <ArrowRightLeft className="w-4 h-4" /> : isTiro ? '🎯' : isFalta ? '⚠️' : isEsquina ? '🚩' : <Clock className="w-4 h-4" />}
                  </div>

                  {/* Card */}
                  <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-white/5 shadow-lg backdrop-blur-md transition-all
                    ${isGol ? 'bg-emerald-500/10 border-emerald-500/20' : 
                      isBadAction ? 'bg-red-500/10 border-red-500/20' : 
                      'bg-white/5 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isGol ? 'text-emerald-400' : isBadAction ? 'text-red-400' : isAmarilla ? 'text-yellow-400' : 'text-slate-400'}`}>
                         {evm.tipo_accion} 
                         {isEnContra && !isGolRival && <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[9px]">(En Contra)</span>}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{evm.minuto}'</span>
                    </div>

                    {evm.jugador && !isCambio && (
                      <div className="flex items-center gap-3 mt-2">
                        <img src={evm.jugador.foto_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                        <span className="font-bold text-sm text-slate-200">{evm.jugador.nombres} {evm.jugador.apellidos}</span>
                      </div>
                    )}

                    {isCambio && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">▲</span>
                          <span className="text-slate-300 font-bold">{evm.jugador?.nombres} {evm.jugador?.apellidos}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-4 h-4 rounded bg-red-500/20 text-red-400 flex items-center justify-center font-bold">▼</span>
                          <span className="text-slate-500">{evm.jugador_sale?.nombres} {evm.jugador_sale?.apellidos}</span>
                        </div>
                      </div>
                    )}

                    {cleanComentario && <p className="text-xs text-slate-400 mt-2 italic">{cleanComentario}</p>}

                    {/* Mini Cancha Renderizada */}
                    {posX !== null && posY !== null && (
                      <div className="mt-3 relative w-full aspect-[2/1] bg-emerald-600/20 border border-emerald-500/30 rounded-lg overflow-hidden">
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20 -ml-[1px]" />
                        <div className="absolute top-1/2 left-1/2 w-8 h-8 border border-white/20 rounded-full -mt-4 -ml-4" />
                        <div className="absolute top-1/2 left-0 w-6 h-12 border border-white/20 -mt-6 -ml-[1px]" />
                        <div className="absolute top-1/2 right-0 w-6 h-12 border border-white/20 -mt-6 -mr-[1px]" />
                        
                        <div className="absolute w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-pulse" 
                             style={{left: `${posX}%`, top: `${posY}%`, transform: 'translate(-50%, -50%)'}} />
                      </div>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
