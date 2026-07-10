'use client';

import { useState, useEffect, useRef, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/hooks/useTenant';
import { toast } from 'sonner';
import { Play, Square, Settings, Shield, Clock, ArrowRightLeft, Target, Hand, Flag, AlertTriangle, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function PartidoEnVivo({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.id;
  const { slug: tenantSlug } = useTenant();
  const [tenant, setTenant] = useState<any>(null);
  const [evento, setEvento] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [titulares, setTitulares] = useState<any[]>([]);
  const [suplentes, setSuplentes] = useState<any[]>([]);
  const [alineacionConfirmada, setAlineacionConfirmada] = useState(false);
  const [eventosMinuto, setEventosMinuto] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Cronómetro
  const [segundosActuales, setSegundosActuales] = useState(0);
  const [cronometroActivo, setCronometroActivo] = useState(false);
  const intervalRef = useRef<any>(null);

  // Modal actions
  const [modalAbierto, setModalAbierto] = useState(false);
  const [accionSeleccionada, setAccionSeleccionada] = useState('');
  const [equipoAccion, setEquipoAccion] = useState<'A Favor' | 'En Contra'>('A Favor');
  const [coordenada, setCoordenada] = useState<{x: number, y: number} | null>(null);
  
  // Settings modal
  const [configAbierto, setConfigAbierto] = useState(false);
  const [equipoRival, setEquipoRival] = useState('');
  const [escudoRival, setEscudoRival] = useState('');
  const [esLocal, setEsLocal] = useState(true);

  // Selección
  const [jugadorEntra, setJugadorEntra] = useState('');
  const [jugadorSale, setJugadorSale] = useState('');
  const [jugadorAsistencia, setJugadorAsistencia] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!tenantSlug) return;
      
      const { data: tenantData } = await supabase.from('clubes').select('*').eq('slug', tenantSlug).single();
      setTenant(tenantData);

      const { data: ev } = await supabase.from('eventos').select(`
        *,
        convocatorias (
          id,
          perfiles!convocatorias_jugador_id_fkey (id, nombres, apellidos, foto_url, posicion, numero)
        )
      `).eq('id', matchId).single();

      if (ev) {
        setEvento(ev);
        setEquipoRival(ev.equipo_rival || '');
        setEscudoRival(ev.escudo_rival_url || '');
        setEsLocal(ev.es_local !== false);
        
        if (ev.convocatorias) {
          const jug = ev.convocatorias.map((c: any) => c.perfiles).filter(Boolean);
          setJugadores(jug);
          setSuplentes(jug);
        }
        if (ev.estado_partido !== 'No Iniciado') {
          setAlineacionConfirmada(true);
        }
      }

      fetchEventosMinuto();
      setCargando(false);
    }
    loadData();
  }, [matchId, tenantSlug]);

  const fetchEventosMinuto = async () => {
    const { data } = await supabase.from('eventos_minuto_minuto')
        .select(`
          *,
          jugador:perfiles!eventos_minuto_minuto_jugador_id_fkey (nombres, apellidos),
          jugador_sale:perfiles!eventos_minuto_minuto_jugador_sale_id_fkey (nombres, apellidos)
        `)
        .eq('evento_id', matchId)
        .order('created_at', { ascending: false });
    if (data) setEventosMinuto(data);
  };

  useEffect(() => {
    const channel = supabase.channel('eventos_minuto_minuto')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos_minuto_minuto', filter: `evento_id=eq.${matchId}` }, () => {
        fetchEventosMinuto();
      })
      .subscribe();

    const channelEvento = supabase.channel('eventos_update')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'eventos', filter: `id=eq.${matchId}` }, (payload) => {
         setEvento((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channelEvento);
    };
  }, [matchId]);

  useEffect(() => {
    if (cronometroActivo) {
      intervalRef.current = setInterval(() => {
        setSegundosActuales(s => s + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [cronometroActivo]);

  const toggleCronometro = () => {
    setCronometroActivo(!cronometroActivo);
    if (!cronometroActivo && (evento?.estado_partido === 'No Iniciado' || evento?.estado_partido === 'Programado')) {
      cambiarPeriodo('1er Tiempo');
    }
  };

  const cambiarPeriodo = async (nuevoEstado: string) => {
    await fetch('/api/entrenador/eventos/rival', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: matchId, estado_partido: nuevoEstado })
    });
    setEvento((prev: any) => ({...prev, estado_partido: nuevoEstado}));
    
    if (nuevoEstado === '1er Tiempo') registrarAccion('Inicio', null, null, 'Inicia el 1er Tiempo');
    if (nuevoEstado === 'Descanso') {
      registrarAccion('Fin', null, null, 'Fin del 1er Tiempo');
      setCronometroActivo(false);
    }
    if (nuevoEstado === '2do Tiempo') {
      registrarAccion('Inicio', null, null, 'Inicia el 2do Tiempo');
      setSegundosActuales(45 * 60);
      setCronometroActivo(true);
    }
    if (nuevoEstado === 'Finalizado') {
      registrarAccion('Fin', null, null, 'Final del Partido');
      setCronometroActivo(false);
    }
  };

  const getSiguientePeriodo = () => {
    if (evento?.estado_partido === 'No Iniciado' || evento?.estado_partido === 'Programado') return '1er Tiempo';
    if (evento?.estado_partido === '1er Tiempo') return 'Descanso';
    if (evento?.estado_partido === 'Descanso') return '2do Tiempo';
    return 'Finalizado';
  };

  const guardarConfiguracion = async () => {
    const toastId = toast.loading('Guardando...');
    const res = await fetch('/api/entrenador/eventos/rival', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: matchId, equipo_rival: equipoRival, escudo_rival_url: escudoRival, es_local: esLocal })
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
    setJugadorAsistencia('');
    setEquipoAccion('A Favor');
    setCoordenada(null);
    setModalAbierto(true);
  };

  const registrarAccion = async (tipo: string, jugId?: string | null, saleId?: string | null, comentarioStr?: string) => {
    const toastId = toast.loading('Registrando...');
    
    let comentarioFinal = comentarioStr || '';
    if (tipo === 'Gol' && jugadorAsistencia) {
       const asisName = jugadores.find(j=>j.id===jugadorAsistencia)?.nombres || '';
       comentarioFinal = `Asistencia: ${asisName}`;
    }
    
    // Si la acción requiere especificar pertenencia (no es Inicio, Fin, ni Cambio)
    let tipoFinal = tipo;
    if (['Gol', 'Tarjeta Amarilla', 'Tarjeta Roja', 'Tiro al Arco', 'Atajada', 'Tiro de Esquina', 'Falta'].includes(tipo)) {
       if (equipoAccion === 'En Contra') {
          if (tipo === 'Gol') tipoFinal = 'Gol Contra';
          comentarioFinal = `(En Contra) ${comentarioFinal}`.trim();
       }
       if (coordenada) {
          comentarioFinal = `${comentarioFinal} | pos:${coordenada.x},${coordenada.y}`.trim();
       }
    }

    try {
      const res = await fetch('/api/entrenador/minuto-minuto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evento_id: matchId,
          minuto: Math.floor(segundosActuales / 60),
          tipo_accion: tipoFinal,
          jugador_id: jugId,
          jugador_sale_id: saleId,
          comentario: comentarioFinal,
          tenantSlug,
          es_local: esLocal
        })
      });
      if (res.ok) {
        toast.success('Registrado', { id: toastId });
        setModalAbierto(false);
        
        // Actualizar listas si es un cambio
        if (tipo === 'Cambio' && jugId && saleId) {
          const jSale = titulares.find(t => t.id === saleId);
          const jEntra = suplentes.find(s => s.id === jugId);
          if (jSale && jEntra) {
            setTitulares(prev => [...prev.filter(t => t.id !== saleId), jEntra]);
            setSuplentes(prev => [...prev.filter(s => s.id !== jugId), jSale]);
          }
        }
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
    const res = await fetch(`/api/entrenador/minuto-minuto?id=${id}&evento_id=${matchId}&tipo_accion=${tipo}&jugador_id=${jugId}&es_local=${esLocal}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      toast.success('Eliminado', { id: toastId });
      fetchEventosMinuto();
    } else {
      toast.error('Error al eliminar', { id: toastId });
    }
  };

  const getMarcador = () => {
    if (evento?.es_local === false) return `${evento?.marcador_visitante || 0} - ${evento?.marcador_local || 0}`;
    return `${evento?.marcador_local || 0} - ${evento?.marcador_visitante || 0}`;
  };

  const moverAJugador = (jugador: any, aTitulares: boolean) => {
    if (aTitulares) {
      if (titulares.length >= 11) {
        toast.error('Ya tienes 11 titulares.');
        return;
      }
      setSuplentes(prev => prev.filter(s => s.id !== jugador.id));
      setTitulares(prev => [...prev, jugador]);
    } else {
      setTitulares(prev => prev.filter(t => t.id !== jugador.id));
      setSuplentes(prev => [...prev, jugador]);
    }
  };

  if (cargando) return <div className="p-8 text-center text-slate-400">Cargando tablero...</div>;

  const brandColor = tenant?.config?.color || '#06b6d4';

  // Vista de Alineación
  if (!alineacionConfirmada) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <h1 className="text-3xl font-black text-slate-800 uppercase italic">Confirmar Alineación</h1>
        <p className="text-slate-500">Selecciona los 11 titulares antes de iniciar el partido.</p>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
              Suplentes / Convocados
              <span className="text-sm font-normal text-slate-500">{suplentes.length} jugadores</span>
            </h3>
            <div className="space-y-2">
              {suplentes.map(j => (
                <div key={j.id} onClick={() => moverAJugador(j, true)} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-colors">
                  <div className="font-bold text-sm text-slate-700">{j.nombres} {j.apellidos}</div>
                  <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Mover a Titular ➡️</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200">
            <h3 className="font-bold text-emerald-800 mb-4 flex items-center justify-between">
              11 Titular
              <span className="text-sm font-black text-emerald-600">{titulares.length}/11</span>
            </h3>
            <div className="space-y-2">
              {titulares.map(j => (
                <div key={j.id} onClick={() => moverAJugador(j, false)} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-red-500 transition-colors">
                  <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">⬅️ Quitar</div>
                  <div className="font-bold text-sm text-emerald-700">{j.nombres} {j.apellidos}</div>
                </div>
              ))}
              {titulares.length === 0 && <p className="text-center text-emerald-600/50 text-sm py-4 italic">No hay titulares seleccionados</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button 
            onClick={() => {
              setAlineacionConfirmada(true);
            }}
            className="bg-slate-900 text-white font-black uppercase tracking-widest px-8 py-4 rounded-xl shadow-lg hover:bg-slate-800 transition-colors"
          >
            Confirmar y Ver Tablero
          </button>
        </div>
      </div>
    );
  }

  // Actores disponibles para el partido (idealmente mostramos solo titulares para acciones normales, excepto cambios)
  const actoresPrincipales = titulares.length > 0 ? titulares : jugadores;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
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
                <img src={tenant?.config?.logo || tenant?.logo_url || '/logo.png'} className="w-16 h-16 object-contain drop-shadow-lg" />
             ) : (
                <img src={evento?.escudo_rival_url || 'https://cdn-icons-png.flaticon.com/512/1162/1162815.png'} className="w-16 h-16 object-contain drop-shadow-lg" />
             )}
             <span className="font-bold text-sm text-center uppercase tracking-widest">{evento?.es_local ? tenant?.config?.nombre_corto : (evento?.equipo_rival || 'Rival')}</span>
          </div>

          <div className="w-1/3 flex flex-col items-center justify-center">
             <div className="text-4xl font-black italic tracking-tighter mb-1">{getMarcador()}</div>
             <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 text-emerald-400">
               {['1er Tiempo', '2do Tiempo'].includes(evento?.estado_partido) ? <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> : null}
               {evento?.estado_partido}
             </div>
             <div className="mt-2 text-3xl font-mono font-black text-slate-100">
                {Math.floor(segundosActuales / 60).toString().padStart(2, '0')}:{(segundosActuales % 60).toString().padStart(2, '0')}
             </div>
          </div>

          <div className="flex flex-col items-center gap-2 w-1/3">
             {evento?.es_local ? (
                <img src={evento?.escudo_rival_url || 'https://cdn-icons-png.flaticon.com/512/1162/1162815.png'} className="w-16 h-16 object-contain drop-shadow-lg" />
             ) : (
                <img src={tenant?.config?.logo || tenant?.logo_url || '/logo.png'} className="w-16 h-16 object-contain drop-shadow-lg" />
             )}
             <span className="font-bold text-sm text-center uppercase tracking-widest">{evento?.es_local ? (evento?.equipo_rival || 'Rival') : tenant?.config?.nombre_corto}</span>
          </div>
        </div>

        {/* Controles de Tiempo */}
        <div className="flex items-center gap-4 relative z-10 bg-slate-800/50 px-6 py-2 rounded-2xl">
           <button 
             onClick={toggleCronometro}
             className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center hover:scale-105 transition-transform"
           >
             {cronometroActivo ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
           </button>
           <div className="flex flex-col">
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cronómetro</span>
             <div className="flex items-center gap-3 mt-1">
               <button onClick={() => setSegundosActuales(s => Math.max(0, s - 60))} className="text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg">-</button>
               <button onClick={() => setSegundosActuales(s => s + 60)} className="text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg">+</button>
             </div>
           </div>
        </div>
      </div>

      {/* Botones de Acción (Grid Avanzado) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
         <button onClick={() => abrirModalAccion('Gol')} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl shadow-md">⚽</div>
            <span className="font-black text-[10px] uppercase tracking-widest">Gol</span>
         </button>
         <button onClick={() => abrirModalAccion('Tarjeta Amarilla')} className="bg-yellow-50 hover:bg-yellow-100 text-yellow-600 border border-yellow-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all">
            <div className="w-8 h-10 rounded bg-yellow-400 text-white flex items-center justify-center shadow-md"></div>
            <span className="font-black text-[10px] uppercase tracking-widest mt-1">Amarilla</span>
         </button>
         <button onClick={() => abrirModalAccion('Tarjeta Roja')} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all">
            <div className="w-8 h-10 rounded bg-red-500 text-white flex items-center justify-center shadow-md"></div>
            <span className="font-black text-[10px] uppercase tracking-widest mt-1">Roja</span>
         </button>

         {/* Nuevas Acciones */}
         <button onClick={() => abrirModalAccion('Tiro al Arco')} className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md"><Target className="w-5 h-5" /></div>
            <span className="font-black text-[10px] uppercase tracking-widest">Tiro al Arco</span>
         </button>
         <button onClick={() => abrirModalAccion('Atajada')} className="bg-cyan-50 hover:bg-cyan-100 text-cyan-600 border border-cyan-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all">
            <div className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-md"><Hand className="w-5 h-5" /></div>
            <span className="font-black text-[10px] uppercase tracking-widest">Atajada</span>
         </button>
         <button onClick={() => abrirModalAccion('Tiro de Esquina')} className="bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all">
            <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-md"><Flag className="w-5 h-5" /></div>
            <span className="font-black text-[10px] uppercase tracking-widest">Esquina</span>
         </button>
         <button onClick={() => abrirModalAccion('Falta')} className="bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all">
            <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md"><AlertTriangle className="w-5 h-5" /></div>
            <span className="font-black text-[10px] uppercase tracking-widest">Falta</span>
         </button>

         {/* Controles Maestra */}
         <button onClick={() => abrirModalAccion('Cambio')} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all sm:col-span-2">
            <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md"><ArrowRightLeft className="w-5 h-5" /></div>
            <span className="font-black text-[10px] uppercase tracking-widest">Sustitución</span>
         </button>
         
         {evento?.estado_partido !== 'Finalizado' && (
           <button onClick={() => cambiarPeriodo(getSiguientePeriodo())} className="bg-slate-800 hover:bg-slate-900 text-white border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all sm:col-span-2">
              <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center shadow-md">
                <Clock className="w-5 h-5" />
              </div>
              <span className="font-black text-[10px] uppercase tracking-widest">{evento?.estado_partido === 'No Iniciado' ? 'Iniciar 1er Tiempo' : evento?.estado_partido === '1er Tiempo' ? 'Finalizar 1er Tiempo' : evento?.estado_partido === 'Descanso' ? 'Iniciar 2do Tiempo' : 'Finalizar Partido'}</span>
           </button>
         )}
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
                      {evm.tipo_accion === 'Tiro al Arco' && <span className="text-blue-500">🎯 TIRO AL ARCO</span>}
                      {evm.tipo_accion === 'Atajada' && <span className="text-cyan-500">🧤 ATAJADA</span>}
                      {evm.tipo_accion === 'Tiro de Esquina' && <span className="text-purple-500">🚩 TIRO DE ESQUINA</span>}
                      {evm.tipo_accion === 'Falta' && <span className="text-orange-500">⚠️ FALTA</span>}
                      {evm.tipo_accion === 'Inicio' && <span className="text-emerald-500">▶️ {evm.comentario || 'INICIO'}</span>}
                      {evm.tipo_accion === 'Fin' && <span className="text-slate-800">⏹️ {evm.comentario || 'FINAL'}</span>}
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

                    {evm.comentario && !['Inicio','Fin'].includes(evm.tipo_accion) && <p className="text-slate-500 text-xs italic mt-0.5">{evm.comentario}</p>}
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
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Jugador que Entra 🟩 (Suplentes)</label>
                    <select value={jugadorEntra} onChange={e => setJugadorEntra(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium">
                      <option value="">Seleccionar Jugador</option>
                      {suplentes.map(j => <option key={j.id} value={j.id}>{j.nombres} {j.apellidos}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Jugador que Sale 🟥 (Titulares)</label>
                    <select value={jugadorSale} onChange={e => setJugadorSale(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium">
                      <option value="">Seleccionar Jugador</option>
                      {titulares.map(j => <option key={j.id} value={j.id}>{j.nombres} {j.apellidos}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  
                  {/* Selector A Favor / En Contra */}
                  <div className="flex bg-slate-100 rounded-xl p-1">
                     <button onClick={() => setEquipoAccion('A Favor')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-colors ${equipoAccion === 'A Favor' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>A Favor (Club)</button>
                     <button onClick={() => setEquipoAccion('En Contra')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-colors ${equipoAccion === 'En Contra' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-700'}`}>En Contra (Rival)</button>
                  </div>

                  {equipoAccion === 'A Favor' && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Protagonista</label>
                      <select value={jugadorEntra} onChange={e => setJugadorEntra(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium">
                        <option value="">Seleccionar Jugador (Opcional)</option>
                        {actoresPrincipales.map((j: any) => <option key={j.id} value={j.id}>{j.nombres} {j.apellidos}</option>)}
                      </select>
                    </div>
                  )}
                  
                  {accionSeleccionada === 'Gol' && (
                    <div className="mt-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Asistencia (Opcional)</label>
                      <select value={jugadorAsistencia} onChange={e => setJugadorAsistencia(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium">
                        <option value="">Sin asistencia</option>
                        {actoresPrincipales.filter((j:any) => j.id !== jugadorEntra).map((j:any) => <option key={j.id} value={j.id}>{j.nombres} {j.apellidos}</option>)}
                      </select>
                    </div>
                  )}
                  
                  {/* Cancha Interactiva para coordenadas */}
                  {['Tiro al Arco', 'Gol', 'Falta', 'Tiro de Esquina'].includes(accionSeleccionada) && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                        <span>Lugar de la acción (Opcional)</span>
                        {coordenada && <span className="text-emerald-500">Marcado ✓</span>}
                      </label>
                      <div className="relative w-full aspect-[2/1] bg-emerald-600 border border-emerald-700 rounded-lg cursor-crosshair overflow-hidden shadow-inner"
                           onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                              const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                              setCoordenada({x, y});
                           }}>
                        {/* Líneas de la cancha */}
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/70 -ml-[1px]" />
                        <div className="absolute top-1/2 left-1/2 w-12 h-12 border-2 border-white/70 rounded-full -mt-6 -ml-6" />
                        <div className="absolute top-1/2 left-0 w-10 h-20 border-2 border-white/70 -mt-10 -ml-[2px]" />
                        <div className="absolute top-1/2 right-0 w-10 h-20 border-2 border-white/70 -mt-10 -mr-[2px]" />
                        
                        {/* Punto marcado */}
                        {coordenada && (
                          <div className="absolute w-4 h-4 bg-yellow-400 rounded-full border-2 border-white shadow-md transition-all pointer-events-none" 
                               style={{left: `${coordenada.x}%`, top: `${coordenada.y}%`, transform: 'translate(-50%, -50%)'}} />
                        )}
                        {!coordenada && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 pointer-events-none text-white text-xs font-bold uppercase tracking-widest">
                            Toca para marcar
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
