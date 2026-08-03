'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, Settings, UserCheck, TrendingUp, 
  Plus, Trash2, Save, ChevronRight, Search,
  ArrowLeft, Radar as RadarIcon, Info, Loader, Users, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/lib/hooks/useTenant';

// --- COMPONENTE RADAR SVG PERSONALIZADO ---
function RadarChart({ data, size = 300 }: { data: { label: string, value: number }[], size?: number }) {
  if (data.length < 3) return <div className="text-[10px] text-slate-400 text-center flex-1 flex items-center justify-center min-h-[200px]">Se requieren 3+ habilidades para generar el radar</div>;
  
  const center = size / 2;
  const radius = (size / 2) * 0.8;
  const angleStep = (Math.PI * 2) / data.length;

  const points = data.map((d, i) => {
    const r = (d.value / 100) * radius;
    const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
    const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
    return `${x},${y}`;
  }).join(' ');

  // Líneas de fondo (niveles)
  const levels = [0.2, 0.4, 0.6, 0.8, 1];
  
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-full mx-auto drop-shadow-xl" style={{ maxWidth: size }}>
      {/* Niveles de fondo */}
      {levels.map(l => (
        <polygon 
          key={l}
          points={data.map((_, i) => {
            const r = l * radius;
            const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
            const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
            return `${x},${y}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
      ))}
      {/* Ejes */}
      {data.map((_, i) => {
        const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
      })}
      {/* Área de datos */}
      <polygon 
        points={points} 
        fill="rgba(249,115,22,0.3)" 
        stroke="#f97316" 
        strokeWidth="3" 
        strokeLinejoin="round"
      />
      {/* Etiquetas */}
      {data.map((d, i) => {
        const x = center + (radius + 20) * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + (radius + 20) * Math.sin(i * angleStep - Math.PI / 2);
        return (
          <text 
            key={i} 
            x={x} 
            y={y} 
            fill="#94a3b8" 
            fontSize="10" 
            fontWeight="bold" 
            textAnchor="middle" 
            className="uppercase tracking-widest"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

export default function GestionSkillsEntrenador() {
  const [pestaña, setPestaña] = useState<'Evaluación' | 'Configuración'>('Evaluación');
  const [habilidades, setHabilidades] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  
  const [catSeleccionada, setCatSeleccionada] = useState<any>(null);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<any>(null);
  const [busqueda, setBusqueda] = useState('');

  // Estados de Configuración
  const [nuevaHabilidad, setNuevaHabilidad] = useState('');
  const [nuevoTipoHabilidad, setNuevoTipoHabilidad] = useState('General'); // General, Portero, Campo
  
  // Estados de Evaluación
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comentarios, setComentarios] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [historia, setHistoria] = useState<any[]>([]);

  const [promedioCategoria, setPromedioCategoria] = useState<Record<string, number> | null>(null);
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const { slug: tenantSlug } = useTenant();

  useEffect(() => {
    cargarConfig();
    cargarCategorias();
  }, [tenantSlug]);

  const cargarConfig = async () => {
    const { data } = await supabase.from('config_stats').select('*').order('nombre', { ascending: true });
    
    if (data) {
      const procesadas = data.map(h => {
        let tipo = h.tipo_jugador || 'General';
        let nombre = h.nombre;
        // Parsear el prefijo fallback si existe
        if (nombre.startsWith('[PORTERO] ')) { tipo = 'Portero'; nombre = nombre.replace('[PORTERO] ', ''); }
        else if (nombre.startsWith('[CAMPO] ')) { tipo = 'Campo'; nombre = nombre.replace('[CAMPO] ', ''); }
        
        return {
          id: h.id,
          nombreLimpio: nombre,
          tipo_jugador_real: tipo,
          nombreOriginal: h.nombre
        };
      });
      setHabilidades(procesadas);
    } else {
      setHabilidades([]);
    }
  };

  const cargarCategorias = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data: usuario } = await supabase.from('perfiles').select('*').eq('id', session.user.id).single();
    
    if (usuario) {
      try {
        const res = await fetch(`/api/categorias?slug=${tenantSlug}&entrenador_id=${usuario.id}`);
        const data = await res.json();
        if (Array.isArray(data)) setCategorias(data);
      } catch (err) {
        console.error("Error cargando categorías:", err);
      }
    }
  };

  const seleccionarCat = async (cat: any) => {
    setCatSeleccionada(cat);
    const { data: { session } } = await supabase.auth.getSession();
    const { data: usuario } = await supabase.from('perfiles').select('club_id').eq('id', session?.user?.id || '').single();

    // Añadido 'posicion' al select
    const { data: jugs } = await supabase.from('perfiles')
        .select('id, nombres, apellidos, club_id, posicion')
        .eq('rol', 'Futbolista')
        .eq('club_id', usuario?.club_id)  // FILTRO DE SEGURIDAD
        .ilike('grupos', `%${cat.nombre}%`);
    
    setAlumnos(jugs || []);
    setAlumnoSeleccionado(null);
    setSidebarAbierta(false);

    // Calcular Promedio de Categoría (Radar Grupal)
    if (jugs && jugs.length > 0) {
        const ids = jugs.map(j => j.id);
        const { data: evals } = await supabase.from('evaluaciones_tecnicas')
            .select('*')
            .in('jugador_id', ids)
            .order('fecha', { ascending: false });
        
        if (evals && evals.length > 0) {
            // Quedarnos solo con la ÚLTIMA eval de cada jugador
            const ultimasEvals: any[] = [];
            const idsProcesados = new Set();
            evals.forEach(ev => {
                if (!idsProcesados.has(ev.jugador_id)) {
                    ultimasEvals.push(ev);
                    idsProcesados.add(ev.jugador_id);
                }
            });

            // Promediar
            const sumas: Record<string, number> = {};
            ultimasEvals.forEach(ev => {
                const stats = ev.stats as Record<string, number>;
                Object.keys(stats).forEach(key => {
                    sumas[key] = (sumas[key] || 0) + stats[key];
                });
            });

            const promedios: Record<string, number> = {};
            Object.keys(sumas).forEach(key => {
                promedios[key] = Math.round(sumas[key] / ultimasEvals.length);
            });
            setPromedioCategoria(promedios);
        } else {
            setPromedioCategoria(null);
        }
    }
  };

  const seleccionarAlumno = async (alumno: any) => {
    setAlumnoSeleccionado(alumno);
    
    // Cargar historial de evaluaciones
    const { data: evals } = await supabase.from('evaluaciones_tecnicas')
        .select('*')
        .eq('jugador_id', alumno.id)
        .order('fecha', { ascending: false });
    
    setHistoria(evals || []);
    
    // Inicializar ratings con la última evaluación o ceros
    if (evals && evals.length > 0) {
        setRatings(evals[0].stats);
        setComentarios(evals[0].comentarios || '');
    } else {
        const init: Record<string, number> = {};
        // Inicializar todas las habilidades en 50, aunque no todas se muestren
        habilidades.forEach(h => init[h.nombreOriginal] = 50);
        setRatings(init);
        setComentarios('');
    }
    setSidebarAbierta(false);
  };

  const cambiarPosicionAlumno = async (nuevaPos: string) => {
    // Update local state
    setAlumnoSeleccionado({ ...alumnoSeleccionado, posicion: nuevaPos });
    setAlumnos(alumnos.map(a => a.id === alumnoSeleccionado.id ? { ...a, posicion: nuevaPos } : a));

    // Update remote DB
    const toastId = toast.loading("Actualizando posición...");
    const { error } = await supabase.from('perfiles').update({ posicion: nuevaPos }).eq('id', alumnoSeleccionado.id);
    if (error) {
        toast.error("Error al actualizar: " + error.message, { id: toastId });
    } else {
        toast.success("Posición actualizada", { id: toastId });
    }
  };

  const agregarHabilidad = async () => {
    if (!nuevaHabilidad) return;
    
    let payload = { nombre: nuevaHabilidad, tipo_jugador: nuevoTipoHabilidad };
    let { error } = await supabase.from('config_stats').insert([payload]);

    // Fallback strategy si la base de datos no tiene la columna tipo_jugador
    if (error && (error.message.includes('tipo_jugador') || error.message.includes('column'))) {
        const prefix = nuevoTipoHabilidad === 'Portero' ? '[PORTERO] ' : nuevoTipoHabilidad === 'Campo' ? '[CAMPO] ' : '';
        const fallbackPayload = { nombre: prefix + nuevaHabilidad };
        const res = await supabase.from('config_stats').insert([fallbackPayload]);
        error = res.error;
    }

    if (!error) {
        setNuevaHabilidad('');
        setNuevoTipoHabilidad('General');
        cargarConfig();
        toast.success("Habilidad añadida");
    } else {
        toast.error("Error al añadir habilidad: " + error.message);
    }
  };

  const borrarHabilidad = async (id: number) => {
    if (!window.confirm("¿Borrar esta habilidad de la configuración?")) return;
    await supabase.from('config_stats').delete().eq('id', id);
    cargarConfig();
  };

  const guardarEvaluacion = async () => {
    setGuardando(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Solo guardamos los stats relevantes para la posición actual
    const habilidadesFiltradas = getHabilidadesFiltradas();
    const statsA_Guardar: Record<string, number> = {};
    
    habilidadesFiltradas.forEach(h => {
        statsA_Guardar[h.nombreOriginal] = ratings[h.nombreOriginal] || 50;
    });

    const { error } = await supabase.from('evaluaciones_tecnicas').insert([{
        jugador_id: alumnoSeleccionado.id,
        club_id: alumnoSeleccionado.club_id,
        evaluador_id: user?.id,
        stats: statsA_Guardar,
        comentarios,
        fecha: new Date().toISOString().split('T')[0]
    }]);

    if (!error) {
        toast.success("Evaluación guardada correctamente");
        seleccionarAlumno(alumnoSeleccionado);
    } else {
        toast.error("Error al guardar evaluación");
    }
    setGuardando(false);
  };

  const getHabilidadesFiltradas = () => {
     const isPortero = alumnoSeleccionado?.posicion === 'Portero';
     return habilidades.filter(h => {
         if (h.tipo_jugador_real === 'General') return true;
         if (isPortero && h.tipo_jugador_real === 'Portero') return true;
         if (!isPortero && h.tipo_jugador_real === 'Campo') return true;
         return false;
     });
  };

  return (
    <div className="h-screen bg-slate-900 text-white font-sans overflow-hidden flex flex-col">
      
      {/* Header Fijo */}
      <div className="bg-slate-800 border-b border-white/5 p-4 lg:p-6 flex flex-col md:flex-row items-center justify-between shadow-xl z-20 gap-4">
         <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div className="flex items-center gap-4">
                <div className={`p-2 lg:p-3 rounded-2xl ${pestaña === 'Evaluación' ? 'text-brand' : 'bg-slate-700'}`}>
                    <RadarIcon className="w-5 h-5 lg:w-6 lg:h-6 text-current" />
                </div>
                <div>
                    <h1 className="text-lg lg:text-xl font-black tracking-tighter uppercase italic textborder-brand/40">Soccer Stats Lab</h1>
                    <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evolution & Performance Tracking</p>
                </div>
            </div>
            
            <button 
                onClick={() => setSidebarAbierta(!sidebarAbierta)}
                className="lg:hidden p-2 bg-slate-700 rounded-xl text-white"
            >
                {sidebarAbierta ? <Trash2 className="w-5 h-5 rotate-45" /> : <Users className="w-5 h-5" />}
            </button>
         </div>

         <div className="flex w-full md:w-auto gap-1 p-1 bg-slate-900/50 rounded-2xl border border-white/5">
             <button onClick={() => setPestaña('Evaluación')} className={`flex-1 md:flex-none px-4 lg:px-5 py-2 rounded-xl text-[9px] lg:text-[10px] font-black transition-all ${pestaña === 'Evaluación' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-500 hover:text-white'}`}>MODO EVALUACIÓN</button>
             <button onClick={() => setPestaña('Configuración')} className={`flex-1 md:flex-none px-4 lg:px-5 py-2 rounded-xl text-[9px] lg:text-[10px] font-black transition-all ${pestaña === 'Configuración' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-500 hover:text-white'}`}>CONFIGURACIÓN</button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* NAVEGACIÓN IZQUIERDA: CATEGORÍAS Y ALUMNOS */}
        <div className={`
          fixed lg:static inset-y-0 left-0 w-80 bg-slate-800 lg:bg-slate-800/50 border-r border-white/5 flex flex-col overflow-hidden z-30 transition-transform duration-300
          ${sidebarAbierta ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
            {!catSeleccionada ? (
                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Selecciona Categoría</p>
                    {categorias.map(cat => (
                        <button key={cat.id} onClick={() => seleccionarCat(cat)} className="w-full bg-slate-800 hover:bg-slate-700 p-5 rounded-3xl border border-white/5 flex items-center justify-between group transition-all">
                            <span className="font-black text-xs uppercase tracking-tight">{cat.nombre}</span>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <button onClick={() => setCatSeleccionada(null)} className="text-slate-500 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                        <span className="text-[10px] font-black text-brand uppercase">{catSeleccionada.nombre}</span>
                    </div>
                    <div className="p-4 relative">
                        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <input 
                            type="text" 
                            placeholder="Buscar futbolista..." 
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full bg-slate-900 border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-300 outline-none focus:ring-1 focus:ring-brand"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {alumnos.filter(a => `${a.nombres} ${a.apellidos}`.toLowerCase().includes(busqueda.toLowerCase())).map(a => (
                            <button 
                                key={a.id} 
                                onClick={() => seleccionarAlumno(a)}
                                className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${alumnoSeleccionado?.id === a.id ? 'bg-brand text-white shadow-lg' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <div className="flex items-center gap-3 truncate">
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-black text-[10px] ${alumnoSeleccionado?.id === a.id ? 'bg-white text-brand' : 'bg-slate-700 text-slate-500'}`}>{a.nombres.charAt(0)}</div>
                                    <span className="text-[10px] font-black uppercase tracking-tight truncate">{a.nombres} {a.apellidos}</span>
                                </div>
                                {a.posicion && (
                                    <span className={`text-[8px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider flex-shrink-0 ${alumnoSeleccionado?.id === a.id ? 'bg-white/20' : 'bg-slate-900/50 text-slate-500'}`}>
                                        {a.posicion === 'Portero' ? 'POR' : a.posicion === 'Defensa' ? 'DEF' : a.posicion === 'Mediocampista' ? 'MED' : a.posicion === 'Delantero' ? 'DEL' : 'VAR'}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 bg-slate-950 overflow-y-auto custom-scrollbar relative">
            
            {pestaña === 'Configuración' ? (
                <div className="max-w-xl mx-auto p-12 space-y-12">
                     <div className="text-center">
                        <Settings className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <h2 className="text-2xl font-black italic tracking-tighter">CONFIGURADOR TÉCNICO</h2>
                        <p className="text-slate-500 text-xs mt-1">Define las habilidades que evaluarás. Puedes crear stats exclusivos para porteros.</p>
                     </div>

                     <div className="flex flex-col md:flex-row gap-2">
                         <input 
                            type="text" 
                            placeholder="Ej: Reflejos" 
                            value={nuevaHabilidad}
                            onChange={(e) => setNuevaHabilidad(e.target.value)}
                            className="text-brand"
                         />
                         <select
                            value={nuevoTipoHabilidad}
                            onChange={(e) => setNuevoTipoHabilidad(e.target.value)}
                            className="bg-slate-900 border border-white/5 rounded-2xl px-4 text-xs font-bold text-slate-300 outline-none focus:ring-2 focus:ringtext-brand"
                         >
                            <option value="General">General (Todos)</option>
                            <option value="Campo">Solo Jugadores de Campo</option>
                            <option value="Portero">Solo Porteros</option>
                         </select>
                         <button onClick={agregarHabilidad} className="bgtext-brand p-4 rounded-2xl hover:opacity-80 transition-colors shadow-lg flex justify-center"><Plus className="w-6 h-6" /></button>
                     </div>

                     <div className="grid grid-cols-1 gap-2">
                         {habilidades.map(h => (
                             <div key={h.id} className="bg-slate-900 p-4 rounded-2xl border border-white/5 flex items-center justify-between group">
                                 <div className="flex items-center gap-3">
                                    <span className="font-bold text-sm tracking-tight text-slate-300">{h.nombreLimpio}</span>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                                        h.tipo_jugador_real === 'Portero' ? 'bg-indigo-500/10 text-indigo-400' :
                                        h.tipo_jugador_real === 'Campo' ? 'bg-emerald-500/10 text-emerald-400' :
                                        'bg-slate-700 text-slate-400'
                                    }`}>
                                        {h.tipo_jugador_real}
                                    </span>
                                 </div>
                                 <button onClick={() => borrarHabilidad(h.id)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                             </div>
                         ))}
                     </div>
                </div>
            ) : alumnoSeleccionado ? (
                <div className="p-4 lg:p-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    
                    {/* COLUMNA 1: SLIDERS DE EVALUACIÓN */}
                    <div className="space-y-6 lg:space-y-8">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                            <div>
                                 <h2 className="text-2xl lg:text-3xl font-black italic uppercase tracking-tighter text-brand">{alumnoSeleccionado.nombres} {alumnoSeleccionado.apellidos}</h2>
                                 <p className="text-slate-500 text-[10px] lg:text-xs font-bold uppercase tracking-widest mt-1">Evaluación Técnica • {new Date().toLocaleDateString()}</p>
                            </div>
                            
                            {/* EDICIÓN DE POSICIÓN */}
                            <div className="w-full md:w-48 relative shrink-0">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                <select 
                                    value={alumnoSeleccionado.posicion || ''}
                                    onChange={(e) => cambiarPosicionAlumno(e.target.value)}
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-xs font-bold text-white outline-none focus:border-brand cursor-pointer appearance-none shadow-sm"
                                >
                                    <option value="">Asignar Posición...</option>
                                    <option value="Portero">Portero</option>
                                    <option value="Defensa">Defensa</option>
                                    <option value="Lateral">Lateral</option>
                                    <option value="Mediocampista">Mediocampista</option>
                                    <option value="Extremo">Extremo</option>
                                    <option value="Delantero">Delantero</option>
                                </select>
                                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none rotate-90" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            {getHabilidadesFiltradas().length === 0 && (
                                <p className="text-slate-500 text-xs italic py-4">No hay habilidades configuradas para esta posición. Ve a "Configuración" para añadir.</p>
                            )}
                            {getHabilidadesFiltradas().map(h => (
                                <div key={h.id} className="space-y-2">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h.nombreLimpio}</label>
                                        <span className={`text-xl font-black italic ${ratings[h.nombreOriginal] > 80 ? 'text-brand' : ratings[h.nombreOriginal] > 60 ? 'text-amber-400' : 'text-rose-400'}`}>{ratings[h.nombreOriginal] || 50}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="99" 
                                        step="1"
                                        value={ratings[h.nombreOriginal] || 50}
                                        onChange={(e) => setRatings({...ratings, [h.nombreOriginal]: parseInt(e.target.value)})}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accenttext-brand"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observaciones del Coach</label>
                            <textarea 
                                value={comentarios}
                                onChange={(e) => setComentarios(e.target.value)}
                                placeholder="Escribe detalles sobre su evolución..."
                                className="text-brand"
                            />
                        </div>

                        <button 
                            onClick={guardarEvaluacion}
                            disabled={guardando || getHabilidadesFiltradas().length === 0}
                            className="text-brand/30 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {guardando ? 'ACTUALIZANDO CLOUD...' : 'GUARDAR EVALUACIÓN FIFA STYLE ⚡'}
                        </button>
                    </div>

                    {/* COLUMNA 2: VISUALIZACIÓN RADAR Y CURVA */}
                    <div className="space-y-6 lg:space-y-8 pb-10 lg:pb-0">
                        <div className="bg-slate-900/50 rounded-[40px] lg:rounded-[60px] p-6 lg:p-8 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl min-h-[350px] lg:min-h-[450px]">
                             <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                             <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8">Skill Polígon</h3>
                             
                             <RadarChart 
                                 data={getHabilidadesFiltradas().map(h => ({ label: h.nombreLimpio, value: ratings[h.nombreOriginal] || 50 }))}
                                 size={350}
                             />

                             <div className="mt-8 flex gap-6">
                                 <div className="text-center">
                                      <p className="text-[8px] font-black text-slate-500 uppercase">Promedio</p>
                                      <p className="text-2xl font-black text-white italic">
                                        {(() => {
                                            const fil = getHabilidadesFiltradas();
                                            if (fil.length === 0) return 0;
                                            const sum = fil.reduce((a, b) => a + (ratings[b.nombreOriginal] || 50), 0);
                                            return Math.round(sum / fil.length);
                                        })()}
                                      </p>
                                 </div>
                                 <div className="w-px h-8 bg-white/10"></div>
                                 <div className="text-center">
                                      <p className="text-[8px] font-black text-slate-500 uppercase">Potencial</p>
                                      <p className="text-2xl font-black text-brand italic">99</p>
                                 </div>
                             </div>
                        </div>

                        {/* CURVA DE APRENDIZAJE SIMPLIFICADA */}
                        <div className="bg-slate-900 p-8 rounded-[40px] border border-white/5">
                             <div className="flex justify-between items-center mb-6">
                                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><TrendingUp className="text-brand" /> Curva de Aprendizaje</h3>
                                 <span className="bg-brand/10 text-brand text-[8px] font-black px-2 py-0.5 rounded-full">HISTÓRICO</span>
                             </div>
                             
                             <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                 {historia.map((ev, i) => (
                                     <div key={ev.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-white/5">
                                         <div>
                                             <p className="text-[10px] font-black text-white">{new Date(ev.fecha).toLocaleDateString()}</p>
                                             <p className="text-[8px] text-slate-500 uppercase font-bold italic">{ev.comentarios || 'Sin notas'}</p>
                                         </div>
                                         <div className="flex items-center gap-2">
                                             <div className="text-brand italic text-xs">
                                                {(() => {
                                                    const data = ev as any;
                                                    if (!data || !data.stats) return 0;
                                                    const values = Object.values(data.stats) as number[];
                                                    if (values.length === 0) return 0;
                                                    const total = values.reduce((a, b) => a + b, 0);
                                                    return Math.round(total / values.length);
                                                })()}
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                                 {historia.length === 0 && <p className="text-center text-slate-600 text-[10px] py-4">No hay evaluaciones previas.</p>}
                             </div>
                        </div>
                    </div>
                </div>
            ) : catSeleccionada ? (
                <div className="flex flex-col items-center justify-center min-h-full p-8 text-center space-y-8 animate-in fade-in duration-700">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-brand">RESUMEN GRUPAL: {catSeleccionada.nombre}</h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Análisis Estadístico de la Categoría</p>
                    </div>

                    <div className="bg-slate-900 shadow-2xl rounded-[60px] p-12 border border-white/5 relative overflow-hidden">
                        <div className="text-brand to-transparent opacity-50"></div>
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10">Radar de Rendimiento Colectivo (Solo Generales)</h3>
                        
                        {promedioCategoria ? (
                            <div className="space-y-8 w-full max-w-md mx-auto">
                                <RadarChart 
                                    data={habilidades.filter(h => h.tipo_jugador_real === 'General').map(h => ({ label: h.nombreLimpio, value: promedioCategoria[h.nombreOriginal] || 0 }))}
                                    size={400}
                                />
                                <div className="grid grid-cols-3 gap-8">
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-500 uppercase">Nivel Medio</p>
                                        <p className="text-2xl font-black text-white italic">{Math.round(Object.values(promedioCategoria).reduce((a,b) => a+b,0) / Object.keys(promedioCategoria).length)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-500 uppercase">Evaluados</p>
                                        <p className="text-2xl font-black text-brand italic">{alumnos.length}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-500 uppercase">Debilidad</p>
                                        <p className="text-2xl font-black text-rose-500 italic">
                                            {Object.entries(promedioCategoria).sort((a:any, b:any) => a[1] - b[1])[0]?.[0].replace(/\[PORTERO\] |\[CAMPO\] /, '').substring(0,3).toUpperCase() || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-20">
                                <Info className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                                <p className="text-slate-600 text-xs font-medium max-w-[250px] mx-auto">Aún no hay suficientes evaluaciones en este grupo para generar un radar colectivo.</p>
                            </div>
                        )}
                    </div>

                    <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <UserCheck className="w-4 h-4" /> Selecciona un futbolista en el menú lateral para calificarlo individualmente.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center scale-in-center">
                    <div className="w-24 h-24 bg-slate-900 rounded-[40px] flex items-center justify-center mb-6 border border-white/10 shadow-inner">
                        <RadarIcon className="w-10 h-10 text-slate-700 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white/90">Laboratorio de Rendimiento</h2>
                    <p className="text-slate-500 text-xs max-w-sm mt-3 leading-relaxed font-medium">Gestiona la evolución técnica de tu club. Selecciona una categoría para ver el análisis de grupo o califica a un futbolista individualmente.</p>
                </div>
            )}

        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}} />

    </div>
  );
}
