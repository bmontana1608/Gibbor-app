'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/hooks/useTenant';
import { Calendar, Users, Send, ShieldCheck, User } from 'lucide-react';
import { toast } from 'sonner';

export default function ConvocatoriasEntrenador() {
  const { slug: tenantSlug } = useTenant();
  const [tenant, setTenant] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Formulario del Evento
  const [evento, setEvento] = useState({
    titulo: '',
    tipo_evento: 'Torneo',
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

      // 1. Obtener las categorías reales asignadas a este entrenador
      let categoriasDelEntrenador: string[] = [];
      try {
        const resCat = await fetch(`/api/categorias?slug=${tenantSlug}&entrenador_id=${usuario.id}`);
        const cats = await resCat.json();
        if (Array.isArray(cats)) {
          categoriasDelEntrenador = cats.map(c => c.nombre);
        }
      } catch (err) {
        console.error("Error al cargar categorías del entrenador:", err);
      }

      // 2. Cargar jugadores usando el club_id seguro del usuario
      const { data: jugadoresData } = await supabase
        .from('perfiles')
        .select('id, nombres, apellidos, fecha_nacimiento, foto_url, posiciones, grupos')
        .eq('club_id', usuario.club_id)
        .eq('rol', 'Futbolista')
        .neq('estado_miembro', 'Inactivo');

      if (jugadoresData) {
        // Filtrar por categorías asignadas si tiene alguna, sino mostrar todos para no dejarlo varado
        let filtrados = jugadoresData;
        if (categoriasDelEntrenador.length > 0) {
          filtrados = jugadoresData.filter(j => {
             const gruposJugador = j.grupos || '';
             return categoriasDelEntrenador.some(cat => gruposJugador.includes(cat));
          });
        } else {
           // Fallback: tratar de usar usuario.grupos
           const gruposString = (usuario.grupos || '').split(',').map((g: string) => g.trim()).filter(Boolean);
           if (gruposString.length > 0) {
              filtrados = jugadoresData.filter(j => {
                 const gruposJugador = j.grupos || '';
                 return gruposString.some((cat: string) => gruposJugador.includes(cat));
              });
           }
        }
        setJugadores(filtrados);
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
        // En fútbol infantil la categoría se mide solo por el año de nacimiento
        // (Ej: Nacidos en 2012 son Sub 14 en 2026, sin importar el mes)
        const fechaNac = new Date(j.fecha_nacimiento);
        const añoNac = fechaNac.getFullYear();
        const edadDeportiva = añoActual - añoNac;
        catNombre = `Sub ${edadDeportiva}`;

        // Calcular edad biológica/física exacta
        let edadCalculada = añoActual - añoNac;
        const m = hoy.getMonth() - fechaNac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
          edadCalculada--;
        }
        j.edadFisica = edadCalculada;

        // Calcular días para el próximo cumpleaños
        const proximoCumple = new Date(añoActual, fechaNac.getMonth(), fechaNac.getDate());
        if (proximoCumple < hoy) {
          proximoCumple.setFullYear(añoActual + 1);
        }
        const diffTime = proximoCumple.getTime() - hoy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        j.diasParaCumple = diffDays;
      }
      
      if (!grupos[catNombre]) grupos[catNombre] = [];
      grupos[catNombre].push(j);
    });

    // Ordenar alfabéticamente
    Object.keys(grupos).forEach(key => {
      grupos[key].sort((a, b) => (a.nombres || '').localeCompare(b.nombres || ''));
    });

    return grupos;
  };

  const toggleJugador = (id: string) => {
    setSeleccionados(prev => {
      const newSel = { ...prev };
      if (newSel[id]) {
        delete newSel[id]; // Deseleccionar
      } else {
        newSel[id] = 'Titular'; // Seleccionar por defecto como Titular
      }
      return newSel;
    });
  };

  const cambiarRol = (id: string, rol: string) => {
    setSeleccionados(prev => ({ ...prev, [id]: rol }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(seleccionados).length === 0) {
      return toast.error('Debes seleccionar al menos un jugador');
    }
    if (!evento.titulo || !evento.fecha) {
      return toast.error('Completa los campos obligatorios del evento');
    }

    const toastId = toast.loading('Enviando solicitud al Director...');

    const payload = {
      evento: {
        ...evento,
        club_id: tenant.id,
        creado_por: perfil.id
      },
      jugadores: Object.entries(seleccionados).map(([id, rol]) => ({ id, rol_partido: rol }))
    };

    try {
      const res = await fetch('/api/entrenador/convocatorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      toast.success('Convocatoria enviada para aprobación', { id: toastId });
      
      // Limpiar formulario
      setEvento({ titulo: '', tipo_evento: 'Torneo', fecha: '', lugar: '', descripcion: '' });
      setSeleccionados({});
    } catch (err: any) {
      toast.error('Error: ' + err.message, { id: toastId });
    }
  };

  if (cargando) return <div className="p-8 text-center text-slate-400">Cargando jugadores...</div>;

  const grupos = agruparPorCategoria(jugadores);
  const brandColor = tenant?.config?.color || tenant?.color_primario || '#06b6d4';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      <div className="mb-8 border-b pb-6">
        <h1 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-3">
          <ShieldCheck className="w-8 h-8" style={{ color: brandColor }} />
          Nueva Convocatoria
        </h1>
        <p className="text-slate-500 font-medium">Selecciona jugadores para un evento y envíalo a aprobación del Director.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario del Evento */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 sticky top-8">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Calendar className="w-4 h-4 text-slate-400" /> Datos del Evento
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
                  <option>Torneo Oficial</option>
                  <option>Amistoso</option>
                  <option>Entrenamiento Especial</option>
                  <option>Copa</option>
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
              
              <button 
                type="submit" 
                className="w-full mt-6 text-white font-black uppercase italic tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
                style={{ backgroundColor: brandColor, boxShadow: `0 10px 25px -5px ${brandColor}60` }}
              >
                <Send className="w-5 h-5" />
                Solicitar Convocatoria
              </button>
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
                            {jugador.posiciones || 'Sin posición'} 
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

                      {/* Selector Titular/Suplente (Solo si está seleccionado) */}
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
    </div>
  );
}
