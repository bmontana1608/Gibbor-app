'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/hooks/useTenant';
import { Calendar, Users, Send, ShieldCheck, User, ClipboardList, Edit2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ConvocatoriasEntrenador() {
  const { slug: tenantSlug } = useTenant();
  const [tenant, setTenant] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [misEventos, setMisEventos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Tabs: 'nueva' o 'historial'
  const [activeTab, setActiveTab] = useState<'nueva' | 'historial'>('nueva');

  // Formulario del Evento
  const [evento, setEvento] = useState({
    id: '',
    titulo: '',
    tipo_evento: 'Partido',
    fecha: '',
    lugar: '',
    descripcion: ''
  });

  // Estado de jugadores seleccionados { id: rol_partido }
  const [seleccionados, setSeleccionados] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    async function cargarDatos() {
      if (!tenantSlug) return;
      
      let currentTenant = tenant;
      if (!currentTenant) {
        const resT = await fetch(`/api/tenant?slug=${tenantSlug}`);
        currentTenant = await resT.json();
        setTenant(currentTenant);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !currentTenant) return;

      const { data: usuario } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      setPerfil(usuario);

      if (usuario?.club_id) {
        // Cargar Categorias del Entrenador
        const { data: categoriasData } = await supabase
          .from('categorias')
          .select('nombre')
          .eq('club_id', usuario.club_id)
          .eq('entrenador_id', usuario.id)
          .eq('estado', 'Activo');

        const nombresCategoriasEntrenador = (categoriasData || []).map((c: any) => c.nombre);

        // Cargar Jugadores
        const { data: todosJugadores, error: jugErr } = await supabase
          .from('perfiles')
          .select('id, nombres, apellidos, fecha_nacimiento, foto_url, posicion, grupos')
          .eq('club_id', usuario.club_id)
          .eq('rol', 'Futbolista')
          .neq('estado_miembro', 'Inactivo');

        if (jugErr) {
          console.error('[Convocatorias] Error cargando jugadores:', jugErr.message);
        } else if (todosJugadores) {
          let jugadoresFiltrados = todosJugadores;
          if (nombresCategoriasEntrenador.length > 0) {
            jugadoresFiltrados = todosJugadores.filter((j: any) => {
              const grupoJugador = (j.grupos || '').replace('|MANUAL', '').trim().toLowerCase();
              return nombresCategoriasEntrenador.some(cat => {
                const lowerCat = cat.toLowerCase();
                return grupoJugador === lowerCat || grupoJugador.startsWith(lowerCat);
              });
            });
          }
          setJugadores(jugadoresFiltrados);
        }

        // Cargar Historial de Eventos del Entrenador (usando API para saltar RLS en convocatorias)
        try {
          const resEventos = await fetch(`/api/entrenador/mis-eventos?clubId=${usuario.club_id}&entrenadorId=${usuario.id}`);
          if (resEventos.ok) {
            const eventosData = await resEventos.json();
            setMisEventos(eventosData);
          }
        } catch (error) {
          console.error('[Convocatorias] Error cargando eventos:', error);
        }
      }
      setCargando(false);
    }
    cargarDatos();
  }, [tenantSlug]);

  const agruparPorCategoria = (lista: any[]) => {
    const grupos: { [key: string]: any[] } = {};
    const hoy = new Date();
    const añoActual = hoy.getFullYear();

    lista.forEach(j => {
      let catNombre = 'Sin Fecha';
      j.edadFisica = null;
      j.diasParaCumple = null;

      if (j.fecha_nacimiento) {
        let fechaNac;
        if (j.fecha_nacimiento.includes('/')) {
          const parts = j.fecha_nacimiento.split('/');
          if (parts.length === 3) {
             fechaNac = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          } else {
             fechaNac = new Date(j.fecha_nacimiento);
          }
        } else {
          fechaNac = new Date(j.fecha_nacimiento + 'T12:00:00');
        }

        if (!isNaN(fechaNac.getTime())) {
          const añoNac = fechaNac.getFullYear();
          const edadDeportiva = añoActual - añoNac;
          catNombre = `Sub ${edadDeportiva}`;

          let edadCalculada = añoActual - añoNac;
          const m = hoy.getMonth() - fechaNac.getMonth();
          if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
            edadCalculada--;
          }
          j.edadFisica = edadCalculada;

          const proximoCumple = new Date(añoActual, fechaNac.getMonth(), fechaNac.getDate());
          if (proximoCumple < hoy) {
            proximoCumple.setFullYear(añoActual + 1);
          }
          const diffTime = proximoCumple.getTime() - hoy.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          j.diasParaCumple = diffDays;
        }
      }
      
      if (!grupos[catNombre]) grupos[catNombre] = [];
      grupos[catNombre].push(j);
    });

    Object.keys(grupos).forEach(key => {
      grupos[key].sort((a, b) => (a.nombres || '').localeCompare(b.nombres || ''));
    });

    return grupos;
  };

  const toggleJugador = (id: string) => {
    setSeleccionados(prev => {
      const newSel = { ...prev };
      if (newSel[id]) delete newSel[id];
      else newSel[id] = 'Titular';
      return newSel;
    });
  };

  const cambiarRol = (id: string, rol: string) => {
    setSeleccionados(prev => ({ ...prev, [id]: rol }));
  };

  const editarConvocatoria = (eventoToEdit: any) => {
    setEvento({
      id: eventoToEdit.id,
      titulo: eventoToEdit.titulo || '',
      tipo_evento: eventoToEdit.tipo || 'Partido',
      fecha: eventoToEdit.fecha + (eventoToEdit.hora ? 'T' + eventoToEdit.hora : 'T00:00'),
      lugar: eventoToEdit.lugar || '',
      descripcion: eventoToEdit.descripcion || ''
    });

    const nuevosSeleccionados: { [key: string]: string } = {};
    if (eventoToEdit.convocatorias) {
      eventoToEdit.convocatorias.forEach((c: any) => {
        nuevosSeleccionados[c.jugador_id] = c.rol_partido || 'Titular';
      });
    }
    setSeleccionados(nuevosSeleccionados);
    setActiveTab('nueva');
  };

  const cancelarEdicion = () => {
    setEvento({ id: '', titulo: '', tipo_evento: 'Partido', fecha: '', lugar: '', descripcion: '' });
    setSeleccionados({});
    setActiveTab('historial');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(seleccionados).length === 0) {
      return toast.error('Debes seleccionar al menos un jugador');
    }
    if (!evento.titulo || !evento.fecha) {
      return toast.error('Completa los campos obligatorios del evento');
    }

    const toastId = toast.loading('Enviando solicitud...');

    const payload = {
      evento: {
        ...evento,
        club_id: tenant.id,
        creado_por: perfil.id
      },
      jugadores: Object.entries(seleccionados).map(([id, rol]) => ({ id, rol_partido: rol }))
    };

    try {
      const method = evento.id ? 'PUT' : 'POST';
      const res = await fetch('/api/entrenador/convocatorias', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      toast.success(evento.id ? 'Convocatoria actualizada y devuelta a revisión' : 'Convocatoria enviada para aprobación', { id: toastId });
      
      // Actualizar la lista local
      if (evento.id) {
        setMisEventos(prev => prev.map(ev => ev.id === data.evento.id ? { ...data.evento, convocatorias: payload.jugadores.map(j => ({jugador_id: j.id, rol_partido: j.rol_partido})) } : ev));
      } else {
        setMisEventos(prev => [{ ...data.evento, convocatorias: payload.jugadores.map(j => ({jugador_id: j.id, rol_partido: j.rol_partido})) }, ...prev]);
      }

      setEvento({ id: '', titulo: '', tipo_evento: 'Partido', fecha: '', lugar: '', descripcion: '' });
      setSeleccionados({});
      setActiveTab('historial');
    } catch (err: any) {
      toast.error('Error: ' + err.message, { id: toastId });
    }
  };

  if (cargando) return <div className="p-8 text-center text-slate-400">Cargando datos...</div>;

  const grupos = agruparPorCategoria(jugadores);
  const brandColor = tenant?.config?.color || tenant?.color_primario || '#06b6d4';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      <div className="mb-8 border-b pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-3">
            <ShieldCheck className="w-8 h-8" style={{ color: brandColor }} />
            Convocatorias
          </h1>
          <p className="text-slate-500 font-medium">Gestiona y envía nóminas para aprobación.</p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('nueva')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'nueva' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:bg-slate-200/50'}`}
          >
            <PlusCircle className="w-4 h-4" /> 
            {evento.id ? 'Editando Lista' : 'Nueva Convocatoria'}
          </button>
          <button 
            onClick={() => {
              if (evento.id) cancelarEdicion();
              else setActiveTab('historial');
            }}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'historial' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:bg-slate-200/50'}`}
          >
            <ClipboardList className="w-4 h-4" /> 
            Historial
          </button>
        </div>
      </div>

      {activeTab === 'historial' && (
        <div className="space-y-6">
          {misEventos.length === 0 && (
            <div className="text-center p-12 bg-white rounded-[2rem] border border-slate-100">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">No has creado ninguna convocatoria.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {misEventos.map(ev => (
              <div key={ev.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col">
                <div className={`absolute top-0 left-0 w-2 h-full ${ev.estado === 'Aprobado' ? 'bg-emerald-500' : ev.estado === 'Devuelta' ? 'bg-rose-500' : 'bg-amber-400'}`}></div>
                
                <div className="flex justify-between items-start pl-4 mb-4">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${ev.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-600' : ev.estado === 'Devuelta' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                    {ev.estado}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-md">{ev.tipo}</span>
                </div>
                
                <div className="pl-4 flex-1">
                  <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter mb-2">{ev.titulo}</h3>
                  <div className="space-y-2 text-sm text-slate-500 font-medium mb-6">
                    <p className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(ev.fecha + (ev.hora ? 'T' + ev.hora : '')).toLocaleString()}</p>
                    <p className="flex items-center gap-2">🏟️ {ev.lugar || 'Por definir'}</p>
                    <p className="flex items-center gap-2"><Users className="w-4 h-4" /> {ev.convocatorias?.length || 0} Jugadores</p>
                  </div>
                </div>

                {(ev.estado === 'Pendiente' || ev.estado === 'Devuelta') && (
                  <button
                    onClick={() => editarConvocatoria(ev)}
                    className="w-full py-3 mt-auto bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Modificar Lista
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'nueva' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario del Evento */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 sticky top-8">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center justify-between mb-6">
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> Datos del Evento</span>
                {evento.id && <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-[10px]">Edición</span>}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Título / Nombre</label>
                  <input 
                    required
                    type="text" 
                    value={evento.titulo}
                    onChange={e => setEvento({...evento, titulo: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold mt-1 outline-none focus:ring-2" 
                    style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                    placeholder="Ej: Final Copa Libertadores" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo</label>
                  <select 
                    value={evento.tipo_evento}
                    onChange={e => setEvento({...evento, tipo_evento: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold mt-1 outline-none focus:ring-2"
                    style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                  >
                    <option value="Partido">Partido Oficial</option>
                    <option value="Amistoso">Partido Amistoso</option>
                    <option value="Entrenamiento">Entrenamiento Especial</option>
                    <option value="Evento">Evento Social / Viaje</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha y Hora</label>
                  <input 
                    required
                    type="datetime-local" 
                    value={evento.fecha}
                    onChange={e => setEvento({...evento, fecha: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold mt-1 outline-none focus:ring-2" 
                    style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lugar / Estadio</label>
                  <input 
                    type="text" 
                    value={evento.lugar}
                    onChange={e => setEvento({...evento, lugar: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold mt-1 outline-none focus:ring-2" 
                    style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                  />
                </div>
                
                <div className="pt-4 flex gap-2">
                  {evento.id && (
                    <button 
                      type="button"
                      onClick={cancelarEdicion}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest py-4 rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    type="submit" 
                    className="flex-[2] text-white font-black uppercase italic tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
                    style={{ backgroundColor: brandColor, boxShadow: `0 10px 25px -5px ${brandColor}60` }}
                  >
                    <Send className="w-5 h-5" />
                    {evento.id ? 'Guardar Cambios' : 'Solicitar'}
                  </button>
                </div>
                <p className="text-[10px] text-center text-slate-400 mt-2">Revisión requerida por Director</p>
              </form>
            </div>
          </div>

          {/* Lista de Jugadores */}
          <div className="lg:col-span-2 space-y-8">
            {Object.keys(grupos).sort().map(categoria => (
              <div key={categoria} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter mb-4 flex items-center gap-2 border-b pb-4">
                  <Users className="w-5 h-5 text-slate-400" /> {categoria}
                  {/^Sub \d+$/.test(categoria) && (
                    <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                      Nacidos {new Date().getFullYear() - parseInt(categoria.replace('Sub ', ''), 10)}
                    </span>
                  )}
                  <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{grupos[categoria].length} Jugadores</span>
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {grupos[categoria].map((jugador) => {
                    const isSelected = !!seleccionados[jugador.id];
                    return (
                      <div 
                        key={jugador.id} 
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col gap-3 ${isSelected ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200'}`}
                      >
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleJugador(jugador.id)}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-100 overflow-hidden ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>
                            {jugador.foto_url ? (
                              <img src={jugador.foto_url} alt="foto" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 truncate text-sm">{jugador.nombres} {jugador.apellidos}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
                              {jugador.posicion || 'Sin posición'} 
                              {jugador.edadFisica !== null && <span className="font-black text-slate-700 ml-1">({jugador.edadFisica} años)</span>}
                            </p>
                            {jugador.diasParaCumple !== null && jugador.diasParaCumple <= 45 && (
                              <div className="mt-1">
                                <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-amber-200 shadow-sm">
                                  ⚠️ Cumple en {jugador.diasParaCumple} días
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                            <button 
                              onClick={() => cambiarRol(jugador.id, 'Titular')}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${seleccionados[jugador.id] === 'Titular' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-500 hover:bg-slate-50'}`}
                            >
                              Titular
                            </button>
                            <button 
                              onClick={() => cambiarRol(jugador.id, 'Suplente')}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${seleccionados[jugador.id] === 'Suplente' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-500 hover:bg-slate-50'}`}
                            >
                              Suplente
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {jugadores.length === 0 && (
              <div className="text-center p-12 bg-white rounded-[2rem] border border-slate-100">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">No hay jugadores registrados en tu club.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
