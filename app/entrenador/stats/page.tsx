'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, Settings, UserCheck, TrendingUp, 
  Plus, Trash2, Save, ChevronRight, Search,
  ArrowLeft, Radar as RadarIcon, Info, Loader
} from 'lucide-react';
import { toast } from 'sonner';

// --- COMPONENTE RADAR SVG PERSONALIZADO ---
function RadarChart({ data, size = 300 }: { data: { label: string, value: number }[], size?: number }) {
  if (data.length < 3) return <div className="text-[10px] text-slate-400">Se requieren 3+ habilidades</div>;
  
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
    <svg width={size} height={size} className="mx-auto drop-shadow-xl">
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
  
  // Estados de Evaluación
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comentarios, setComentarios] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [historia, setHistoria] = useState<any[]>([]);

  const [promedioCategoria, setPromedioCategoria] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    cargarConfig();
    cargarCategorias();
  }, []);

  const cargarConfig = async () => {
    const { data } = await supabase.from('config_stats').select('*').order('nombre', { ascending: true });
    setHabilidades(data || []);
  };

  const cargarCategorias = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: usuario } = await supabase.from('perfiles').select('nombres, apellidos').eq('id', session.user.id).single();
    const nombreCompleto = `${usuario?.nombres} ${usuario?.apellidos}`;
    const { data } = await supabase.from('categorias').select('*').ilike('entrenadores', `%${nombreCompleto}%`);
    setCategorias(data || []);
  };

  const seleccionarCat = async (cat: any) => {
    setCatSeleccionada(cat);
    const { data: jugs } = await supabase.from('perfiles')
        .select('id, nombres, apellidos')
        .eq('rol', 'Futbolista')
        .ilike('grupos', `%${cat.nombre}%`);
    
    setAlumnos(jugs || []);
    setAlumnoSeleccionado(null);

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
        habilidades.forEach(h => init[h.nombre] = 50);
        setRatings(init);
        setComentarios('');
    }
  };

  const agregarHabilidad = async () => {
    if (!nuevaHabilidad) return;
    const { error } = await supabase.from('config_stats').insert([{ nombre: nuevaHabilidad }]);
    if (!error) {
        setNuevaHabilidad('');
        cargarConfig();
        toast.success("Habilidad añadida");
    } else {
        toast.error("Error al añadir habilidad");
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
    
    const { error } = await supabase.from('evaluaciones_tecnicas').insert([{
        jugador_id: alumnoSeleccionado.id,
        evaluador_id: user?.id,
        stats: ratings,
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

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans overflow-hidden flex flex-col">
      
      {/* Header Fijo */}
      <div className="bg-slate-800 border-b border-white/5 p-6 flex items-center justify-between shadow-xl z-20">
         <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${pestaña === 'Evaluación' ? 'bg-orange-500' : 'bg-slate-700'}`}>
                <RadarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
                 <h1 className="text-xl font-black tracking-tighter uppercase italic text-orange-400">Soccer Stats Lab</h1>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evolution & Performance Tracking</p>
            </div>
         </div>

         <div className="flex gap-2 p-1 bg-slate-900/50 rounded-2xl border border-white/5">
             <button onClick={() => setPestaña('Evaluación')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${pestaña === 'Evaluación' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white'}`}>MODO EVALUACIÓN</button>
             <button onClick={() => setPestaña('Configuración')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${pestaña === 'Configuración' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white'}`}>CONFIGURACIÓN</button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* NAVEGACIÓN IZQUIERDA: CATEGORÍAS Y ALUMNOS */}
        <div className="w-80 bg-slate-800/50 border-r border-white/5 flex flex-col overflow-hidden">
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
                        <span className="text-[10px] font-black text-orange-500 uppercase">{catSeleccionada.nombre}</span>
                    </div>
                    <div className="p-4 relative">
                        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <input 
                            type="text" 
                            placeholder="Buscar futbolista..." 
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full bg-slate-900 border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-300 outline-none focus:ring-1 focus:ring-orange-500"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {alumnos.filter(a => `${a.nombres} ${a.apellidos}`.toLowerCase().includes(busqueda.toLowerCase())).map(a => (
                            <button 
                                key={a.id} 
                                onClick={() => seleccionarAlumno(a)}
                                className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${alumnoSeleccionado?.id === a.id ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${alumnoSeleccionado?.id === a.id ? 'bg-white text-orange-600' : 'bg-slate-700 text-slate-500'}`}>{a.nombres.charAt(0)}</div>
                                <span className="text-[10px] font-black uppercase tracking-tight truncate">{a.nombres} {a.apellidos}</span>
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
                        <p className="text-slate-500 text-xs mt-1">Define qué habilidades quieres medir en tus entrenamientos.</p>
                     </div>

                     <div className="flex gap-2">
                         <input 
                            type="text" 
                            placeholder="Nombre de habilidad (ej: Visión)" 
                            value={nuevaHabilidad}
                            onChange={(e) => setNuevaHabilidad(e.target.value)}
                            className="flex-1 bg-slate-900 border border-white/5 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-orange-500"
                         />
                         <button onClick={agregarHabilidad} className="bg-orange-600 p-4 rounded-2xl hover:bg-orange-500 transition-colors shadow-lg"><Plus className="w-6 h-6" /></button>
                     </div>

                     <div className="grid grid-cols-1 gap-2">
                         {habilidades.map(h => (
                             <div key={h.id} className="bg-slate-900 p-4 rounded-2xl border border-white/5 flex items-center justify-between group">
                                 <span className="font-bold text-sm tracking-tight text-slate-300">{h.nombre}</span>
                                 <button onClick={() => borrarHabilidad(h.id)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                             </div>
                         ))}
                     </div>
                </div>
            ) : alumnoSeleccionado ? (
                <div className="p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
                    
                    {/* COLUMNA 1: SLIDERS DE EVALUACIÓN */}
                    <div className="space-y-8">
                        <div>
                             <h2 className="text-3xl font-black italic uppercase tracking-tighter text-orange-400">{alumnoSeleccionado.nombres} {alumnoSeleccionado.apellidos}</h2>
                             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Evaluación Técnica • {new Date().toLocaleDateString()}</p>
                        </div>

                        <div className="space-y-6">
                            {habilidades.map(h => (
                                <div key={h.id} className="space-y-2">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h.nombre}</label>
                                        <span className={`text-xl font-black italic ${ratings[h.nombre] > 80 ? 'text-orange-400' : ratings[h.nombre] > 60 ? 'text-amber-400' : 'text-rose-400'}`}>{ratings[h.nombre] || 50}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="99" 
                                        step="1"
                                        value={ratings[h.nombre] || 50}
                                        onChange={(e) => setRatings({...ratings, [h.nombre]: parseInt(e.target.value)})}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
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
                                className="w-full bg-slate-900 border border-white/5 rounded-3xl p-5 text-xs font-medium text-slate-300 min-h-[100px] outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <button 
                            onClick={guardarEvaluacion}
                            disabled={guardando}
                            className="w-full bg-orange-600 hover:bg-orange-500 p-5 rounded-3xl font-black italic tracking-tighter uppercase shadow-2xl shadow-orange-900/40 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {guardando ? 'ACTUALIZANDO CLOUD...' : 'GUARDAR EVALUACIÓN FIFA STYLE ⚡'}
                        </button>
                    </div>

                    {/* COLUMNA 2: VISUALIZACIÓN RADAR Y CURVA */}
                    <div className="space-y-8">
                        <div className="bg-slate-900/50 rounded-[60px] p-8 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl min-h-[450px]">
                             <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                             <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8">Skill Polígon</h3>
                             
                             <RadarChart 
                                 data={habilidades.map(h => ({ label: h.nombre, value: ratings[h.nombre] || 50 }))}
                                 size={350}
                             />

                             <div className="mt-8 flex gap-6">
                                 <div className="text-center">
                                      <p className="text-[8px] font-black text-slate-500 uppercase">Promedio</p>
                                      <p className="text-2xl font-black text-white italic">
                                        {Math.round(Object.values(ratings).reduce((a,b) => a+b, 0) / (habilidades.length || 1))}
                                      </p>
                                 </div>
                                 <div className="w-px h-8 bg-white/10"></div>
                                 <div className="text-center">
                                      <p className="text-[8px] font-black text-slate-500 uppercase">Potencial</p>
                                      <p className="text-2xl font-black text-orange-400 italic">99</p>
                                 </div>
                             </div>
                        </div>

                        {/* CURVA DE APRENDIZAJE SIMPLIFICADA */}
                        <div className="bg-slate-900 p-8 rounded-[40px] border border-white/5">
                             <div className="flex justify-between items-center mb-6">
                                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" /> Curva de Aprendizaje</h3>
                                 <span className="bg-orange-500/10 text-orange-500 text-[8px] font-black px-2 py-0.5 rounded-full">HISTÓRICO</span>
                             </div>
                             
                             <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                 {historia.map((ev, i) => (
                                     <div key={ev.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-white/5">
                                         <div>
                                             <p className="text-[10px] font-black text-white">{new Date(ev.fecha).toLocaleDateString()}</p>
                                             <p className="text-[8px] text-slate-500 uppercase font-bold italic">{ev.comentarios || 'Sin notas'}</p>
                                         </div>
                                         <div className="flex items-center gap-2">
                                             <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center font-black text-orange-400 italic text-xs">
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
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-orange-500">RESUMEN GRUPAL: {catSeleccionada.nombre}</h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Análisis Estadístico de la Categoría</p>
                    </div>

                    <div className="bg-slate-900 shadow-2xl rounded-[60px] p-12 border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50"></div>
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10">Radar de Rendimiento Colectivo</h3>
                        
                        {promedioCategoria ? (
                            <div className="space-y-8">
                                <RadarChart 
                                    data={habilidades.map(h => ({ label: h.nombre, value: promedioCategoria[h.nombre] || 0 }))}
                                    size={400}
                                />
                                <div className="grid grid-cols-3 gap-8">
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-500 uppercase">Nivel Medio</p>
                                        <p className="text-2xl font-black text-white italic">{Math.round(Object.values(promedioCategoria).reduce((a,b) => a+b,0) / Object.keys(promedioCategoria).length)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-500 uppercase">Evaluados</p>
                                        <p className="text-2xl font-black text-orange-500 italic">{alumnos.length}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-500 uppercase">Debilidad</p>
                                        <p className="text-2xl font-black text-rose-500 italic">
                                            {Object.entries(promedioCategoria).sort((a:any, b:any) => a[1] - b[1])[0]?.[0].substring(0,3).toUpperCase()}
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
