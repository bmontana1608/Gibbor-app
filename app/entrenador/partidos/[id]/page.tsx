'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/hooks/useTenant';
import { toast } from 'sonner';
import { Play, Square, Settings, Shield, Clock, Plus, Trash2, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';

export default function PartidoEnVivo({ params }: { params: { id: string } }) {
  const { slug: tenantSlug } = useTenant();
  const [tenant, setTenant] = useState<any>(null);
  const [evento, setEvento] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [eventosMinuto, setEventosMinuto] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Cronómetro
  const [minutoActual, setMinutoActual] = useState(0);
  const [cronometroActivo, setCronometroActivo] = useState(false);
  const intervalRef = useRef<any>(null);

  // Modal actions
  const [modalAbierto, setModalAbierto] = useState(false);
  const [accionSeleccionada, setAccionSeleccionada] = useState('');
  
  // Settings modal
  const [configAbierto, setConfigAbierto] = useState(false);
  const [equipoRival, setEquipoRival] = useState('');
  const [escudoRival, setEscudoRival] = useState('');
  const [esLocal, setEsLocal] = useState(true);

  // Selección de cambios
  const [jugadorEntra, setJugadorEntra] = useState('');
  const [jugadorSale, setJugadorSale] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!tenantSlug) return;
      
      const { data: tenantData } = await supabase.from('clubes').select('*').eq('slug', tenantSlug).single();
      setTenant(tenantData);

      // Cargar Evento
      const { data: ev } = await supabase.from('eventos').select(`
        *,
        convocatorias (
          id,
          perfiles!convocatorias_jugador_id_fkey (id, nombres, apellidos, foto_url, posicion, numero)
        )
      `).eq('id', params.id).single();

      if (ev) {
        setEvento(ev);
        setEquipoRival(ev.equipo_rival || '');
        setEscudoRival(ev.escudo_rival_url || '');
        setEsLocal(ev.es_local !== false);
        
        // Jugadores de la convocatoria
        if (ev.convocatorias) {
          const jug = ev.convocatorias.map((c: any) => c.perfiles).filter(Boolean);
          setJugadores(jug);
        }
      }

      // Cargar minuto a minuto
      const { data: minEvents } = await supabase.from('eventos_minuto_minuto')
        .select(`
          *,
          jugador:perfiles!eventos_minuto_minuto_jugador_id_fkey (nombres, apellidos),
          jugador_sale:perfiles!eventos_minuto_minuto_jugador_sale_id_fkey (nombres, apellidos)
        `)
        .eq('evento_id', params.id)
        .order('created_at', { ascending: false });
        
      if (minEvents) setEventosMinuto(minEvents);
      setCargando(false);
    }
    loadData();
  }, [params.id, tenantSlug]);

  useEffect(() => {
    // Suscripción Realtime para actualizar si hay cambios
    const channel = supabase.channel('eventos_minuto_minuto')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos_minuto_minuto', filter: `evento_id=eq.${params.id}` }, (payload) => {
        // En lugar de actualizar manualmente, recargamos la lista para traer los nombres (joins)
        fetchEventosMinuto();
      })
      .subscribe();

    const channelEvento = supabase.channel('eventos_update')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'eventos', filter: `id=eq.${params.id}` }, (payload) => {
         setEvento((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channelEvento);
    };
  }, [params.id]);

  const fetchEventosMinuto = async () => {
    const { data } = await supabase.from('eventos_minuto_minuto')
        .select(`
          *,
          jugador:perfiles!eventos_minuto_minuto_jugador_id_fkey (nombres, apellidos),
          jugador_sale:perfiles!eventos_minuto_minuto_jugador_sale_id_fkey (nombres, apellidos)
        `)
        .eq('evento_id', params.id)
        .order('created_at', { ascending: false });
    if (data) setEventosMinuto(data);
  };

  useEffect(() => {
    if (cronometroActivo) {
      intervalRef.current = setInterval(() => {
        setMinutoActual(m => m + 1);
      }, 60000); // 1 minuto real
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [cronometroActivo]);

  const toggleCronometro = () => {
    setCronometroActivo(!cronometroActivo);
    if (!cronometroActivo && evento?.estado_partido === 'No Iniciado') {
      actualizarEstadoPartido('En Juego');
      registrarAccion('Inicio', null, null, 'Inicia el partido');
    }
  };

  const actualizarEstadoPartido = async (estado: string) => {
    await fetch('/api/entrenador/eventos/rival', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: params.id, estado_partido: estado })
    });
  };

  const guardarConfiguracion = async () => {
    const toastId = toast.loading('Guardando...');
    const res = await fetch('/api/entrenador/eventos/rival', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: params.id, equipo_rival: equipoRival, escudo_rival_url: escudoRival, es_local: esLocal })
    });
    if (res.ok) {
      toast.success('Configuración guardada', { id: toastId });
      setConfigAbierto(false);
      setEvento((prev: any) => ({...prev, equipo_rival: equipoRival, escudo_rival_url: escudoRival, es_local: esLocal}));
    } else {
      toast.error('Error al guardar', { id: toastId });
    }
  };

  const abrirModalAccion = (accion: string) => {
    setAccionSeleccionada(accion);
    setJugadorEntra('');
    setJugadorSale('');
    setModalAbierto(true);
  };

  const registrarAccion = async (tipo: string, jugId?: string | null, saleId?: string | null, comentarioStr?: string) => {
    const toastId = toast.loading('Registrando...');
    try {
      const body = {
        evento_id: params.id,
        minuto: minutoActual,
        tipo_accion: tipo,
        jugador_id: jugId,
        jugador_sale_id: saleId,
        comentario: comentarioStr,
        tenantSlug
      };

      const res = await fetch('/api/entrenador/minuto-minuto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        toast.success('Registrado', { id: toastId });
        setModalAbierto(false);
      } else {
        toast.error('Error al registrar', { id: toastId });
      }
    } catch(e: any) {
      toast.error(e.message, { id: toastId });
    }
  };

  const eliminarEventoMinuto = async (id: string, tipo: string, jugId: string) => {
    if(!confirm('¿Eliminar evento?')) return;
    const toastId = toast.loading('Eliminando...');
    const res = await fetch(`/api/entrenador/minuto-minuto?id=${id}&evento_id=${params.id}&tipo_accion=${tipo}&jugador_id=${jugId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      toast.success('Eliminado', { id: toastId });
      setEventosMinuto(prev => prev.filter(e => e.id !== id));
    } else {
      toast.error('Error al eliminar', { id: toastId });
    }
  };

  const getTeamNames = () => {
    const club = tenant?.config?.nombre_corto || tenant?.config?.nombre || 'Club';
    const rival = evento?.equipo_rival || 'Rival';
    if (evento?.es_local === false) return `${rival} vs ${club}`;
    return `${club} vs ${rival}`;
  };

  const getMarcador = () => {
    if (evento?.es_local === false) return `${evento?.marcador_visitante || 0} - ${evento?.marcador_local || 0}`;
    return `${evento?.marcador_local || 0} - ${evento?.marcador_visitante || 0}`;
  };

  if (cargando) return <div className="p-8 text-center text-slate-400">Cargando tablero...</div>;

  const brandColor = tenant?.config?.color || '#06b6d4';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">Live Feed</h1>
          <p className="text-slate-500 text-sm">Transmisión Minuto a Minuto</p>
        </div>
        <button 
          onClick={() => setConfigAbierto(true)}
          className="bg-white text-slate-700 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 shadow-sm flex items-center gap-2 hover:bg-slate-50"
        >
          <Settings className="w-4 h-4" /> Configurar Partido
        </button>
      </div>

      {/* Marcador Superior */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden flex flex-col items-center">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at top right, ${brandColor}, transparent 50%)`}}></div>
        
        <div className="flex items-center justify-between w-full max-w-lg mb-6 relative z-10">
          <div className="flex flex-col items-center gap-2 w-1/3">
             {evento?.es_local ? (
                <img src={tenant?.config?.logo || '/icon.png'} className="w-16 h-16 object-contain drop-shadow-lg" />
             ) : (
                <img src={evento?.escudo_rival_url || 'https://cdn-icons-png.flaticon.com/512/1162/1162815.png'} className="w-16 h-16 object-contain drop-shadow-lg" />
             )}
             <span className="font-bold text-sm text-center uppercase tracking-widest">{evento?.es_local ? tenant?.config?.nombre_corto : (evento?.equipo_rival || 'Rival')}</span>
          </div>

          <div className="w-1/3 flex flex-col items-center justify-center">
             <div className="text-4xl font-black italic tracking-tighter mb-1">{getMarcador()}</div>
             <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 text-emerald-400">
               {evento?.estado_partido === 'En Juego' ? <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> : null}
               {evento?.estado_partido}
             </div>
             <div className="mt-2 text-2xl font-mono font-bold text-slate-300">
                {minutoActual}'
             </div>
          </div>

          <div className="flex flex-col items-center gap-2 w-1/3">
             {evento?.es_local ? (
                <img src={evento?.escudo_rival_url || 'https://cdn-icons-png.flaticon.com/512/1162/1162815.png'} className="w-16 h-16 object-contain drop-shadow-lg" />
             ) : (
                <img src={tenant?.config?.logo || '/icon.png'} className="w-16 h-16 object-contain drop-shadow-lg" />
             )}
             <span className="font-bold text-sm text-center uppercase tracking-widest">{evento?.es_local ? (evento?.equipo_rival || 'Rival') : tenant?.config?.nombre_corto}</span>
          </div>
        </div>

        {/* Controles de Tiempo */}
        <div className="flex items-center gap-4 relative z-10">
           <button 
             onClick={toggleCronometro}
             className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center hover:scale-105 transition-transform"
           >
             {cronometroActivo ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
           </button>
           <div className="flex flex-col">
             <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Cronómetro</span>
             <div className="flex items-center gap-2 mt-1">
               <button onClick={() => setMinutoActual(m => Math.max(0, m - 1))} className="text-slate-400 hover:text-white px-2">-</button>
               <button onClick={() => setMinutoActual(m => m + 1)} className="text-slate-400 hover:text-white px-2">+</button>
             </div>
           </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
         <button onClick={() => abrirModalAccion('Gol')} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl shadow-md">⚽</div>
            <span className="font-black text-[10px] uppercase tracking-widest">Gol Club</span>
         </button>
         <button onClick={() => registrarAccion('Gol Contra', null, null, 'Gol del equipo rival')} className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all">
            <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-xl shadow-md">🥅</div>
            <span className="font-black text-[10px] uppercase tracking-widest">Gol Rival</span>
         </button>
         <button onClick={() => abrirModalAccion('Tarjeta Amarilla')} className="bg-yellow-50 hover:bg-yellow-100 text-yellow-600 border border-yellow-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all">
            <div className="w-10 h-12 rounded-lg bg-yellow-400 text-white flex items-center justify-center shadow-md"></div>
            <span className="font-black text-[10px] uppercase tracking-widest mt-1">Amarilla</span>
         </button>
         <button onClick={() => abrirModalAccion('Tarjeta Roja')} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all">
            <div className="w-10 h-12 rounded-lg bg-red-500 text-white flex items-center justify-center shadow-md"></div>
            <span className="font-black text-[10px] uppercase tracking-widest mt-1">Roja</span>
         </button>
         <button onClick={() => abrirModalAccion('Cambio')} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all sm:col-span-2">
            <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md"><ArrowRightLeft className="w-5 h-5" /></div>
            <span className="font-black text-[10px] uppercase tracking-widest">Sustitución</span>
         </button>
         <button onClick={() => {
            actualizarEstadoPartido('Finalizado');
            registrarAccion('Fin', null, null, 'Final del Partido');
            setCronometroActivo(false);
         }} className="bg-slate-800 hover:bg-slate-900 text-white border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all sm:col-span-2">
            <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center shadow-md"><Square className="w-5 h-5 fill-current" /></div>
            <span className="font-black text-[10px] uppercase tracking-widest">Finalizar</span>
         </button>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 italic uppercase mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" /> Línea de Tiempo
        </h3>
        
        {eventosMinuto.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No hay eventos registrados aún. Usa los botones superiores para transmitir el partido.</p>
        ) : (
          <div className="space-y-4">
            {eventosMinuto.map((evm: any) => (
              <div key={evm.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                 <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-400">MIN</span>
                    <span className="text-sm font-black text-slate-800">{evm.minuto}'</span>
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-800 uppercase tracking-tight flex items-center gap-2">
                      {evm.tipo_accion === 'Gol' && <span className="text-emerald-500">⚽ GOL</span>}
                      {evm.tipo_accion === 'Gol Contra' && <span className="text-slate-500">🥅 GOL RIVAL</span>}
                      {evm.tipo_accion === 'Tarjeta Amarilla' && <span className="text-yellow-500">🟨 AMARILLA</span>}
                      {evm.tipo_accion === 'Tarjeta Roja' && <span className="text-red-500">🟥 ROJA</span>}
                      {evm.tipo_accion === 'Cambio' && <span className="text-indigo-500">🔄 CAMBIO</span>}
                      {evm.tipo_accion === 'Inicio' && <span className="text-emerald-500">▶️ INICIO</span>}
                      {evm.tipo_accion === 'Fin' && <span className="text-slate-800">⏹️ FINAL</span>}
                    </p>
                    
                    {evm.jugador && evm.tipo_accion !== 'Cambio' && (
                      <p className="text-slate-600 text-sm font-medium">{evm.jugador.nombres} {evm.jugador.apellidos}</p>
                    )}
                    
                    {evm.tipo_accion === 'Cambio' && (
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="text-emerald-600 font-bold flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> Entra: {evm.jugador?.nombres}</span>
                        <span className="text-red-500 font-bold flex items-center gap-1">Sale: {evm.jugador_sale?.nombres}</span>
                      </div>
                    )}

                    {evm.comentario && <p className="text-slate-500 text-xs italic mt-0.5">{evm.comentario}</p>}
                 </div>
                 <button 
                   onClick={() => eliminarEventoMinuto(evm.id, evm.tipo_accion, evm.jugador_id)}
                   className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Accion */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black text-slate-800 italic uppercase mb-4">Registrar {accionSeleccionada}</h2>
            
            <div className="space-y-4">
              {accionSeleccionada === 'Cambio' ? (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Jugador que Entra 🟩</label>
                    <select value={jugadorEntra} onChange={e => setJugadorEntra(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium">
                      <option value="">Seleccionar Jugador</option>
                      {jugadores.map(j => <option key={j.id} value={j.id}>{j.nombres} {j.apellidos}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Jugador que Sale 🟥</label>
                    <select value={jugadorSale} onChange={e => setJugadorSale(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium">
                      <option value="">Seleccionar Jugador</option>
                      {jugadores.map(j => <option key={j.id} value={j.id}>{j.nombres} {j.apellidos}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Protagonista</label>
                  <select value={jugadorEntra} onChange={e => setJugadorEntra(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium">
                    <option value="">Seleccionar Jugador (Opcional)</option>
                    {jugadores.map(j => <option key={j.id} value={j.id}>{j.nombres} {j.apellidos}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button onClick={() => setModalAbierto(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-xs py-3 rounded-xl">Cancelar</button>
                <button 
                  onClick={() => registrarAccion(accionSeleccionada, jugadorEntra, jugadorSale)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xs py-3 rounded-xl shadow-lg shadow-emerald-500/30"
                >
                  Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configuracion */}
      {configAbierto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black text-slate-800 italic uppercase mb-4">Configurar Partido</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Nombre Equipo Rival</label>
                <input type="text" value={equipoRival} onChange={e => setEquipoRival(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium" placeholder="Ej. Real Academia FC" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">URL Escudo Rival (Opcional)</label>
                <input type="text" value={escudoRival} onChange={e => setEscudoRival(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium" placeholder="https://..." />
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={esLocal} onChange={e => setEsLocal(e.target.checked)} className="w-5 h-5 text-emerald-500 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 focus:ring-2" />
                  <span className="text-sm font-bold text-slate-700">Jugamos de Local</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setConfigAbierto(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-xs py-3 rounded-xl">Cancelar</button>
                <button 
                  onClick={guardarConfiguracion}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xs py-3 rounded-xl shadow-lg shadow-emerald-500/30"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
