'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, ChevronRight, Search, ArrowLeft, 
  MapPin, Phone, User, Calendar, Trophy, 
  TrendingUp, Star, Mail, LayoutGrid, List,
  Radar as RadarIcon
} from 'lucide-react';
import { toast } from 'sonner';

// --- REUTILIZAMOS EL RADAR CHART ---
function RadarChart({ data, size = 250 }: { data: { label: string, value: number }[], size?: number }) {
  if (data.length < 3) return <div className="text-[10px] text-slate-400 py-10 text-center">Sin datos técnicos suficientes</div>;
  
  const center = size / 2;
  const radius = (size / 2) * 0.7;
  const angleStep = (Math.PI * 2) / data.length;

  const points = data.map((d, i) => {
    const r = (d.value / 100) * radius;
    const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
    const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
    return `${x},${y}`;
  }).join(' ');

  const levels = [0.2, 0.4, 0.6, 0.8, 1];
  
  return (
    <svg width={size} height={size} className="mx-auto">
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
          stroke="rgba(0,0,0,0.05)"
          strokeWidth="1"
        />
      ))}
      {data.map((_, i) => {
        const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />;
      })}
      <polygon 
        points={points} 
        fill="rgba(249,115,22,0.2)" 
        stroke="#f97316" 
        strokeWidth="2" 
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const x = center + (radius + 15) * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + (radius + 15) * Math.sin(i * angleStep - Math.PI / 2);
        return (
          <text key={i} x={x} y={y} fill="#64748b" fontSize="7" fontWeight="black" textAnchor="middle" className="uppercase uppercase">
            {d.label.substring(0, 3)}
          </text>
        );
      })}
    </svg>
  );
}

export default function GestionCategoriasEntrenador() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [catSeleccionada, setCatSeleccionada] = useState<any>(null);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [alumnoDetalle, setAlumnoDetalle] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  // Datos técnicos del alumno seleccionado
  const [lastEval, setLastEval] = useState<any>(null);
  const [puntosLog, setPuntosLog] = useState<any[]>([]);

  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data: usuario } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    // Usar API interna para saltar RLS
    if (usuario) {
      try {
        const res = await fetch(`/api/categorias?club_id=${usuario.club_id}&entrenador_id=${usuario.id}`);
        const data = await res.json();
        if (Array.isArray(data)) setCategorias(data);
      } catch (err) {
        console.error("Error:", err);
      }
    }
    
    setCargando(false);
  };

  const seleccionarCat = async (cat: any) => {
    setCargando(true);
    setCatSeleccionada(cat);
    const { data } = await supabase.from('perfiles')
        .select('*')
        .eq('rol', 'Futbolista')
        .ilike('grupos', `%${cat.nombre}%`)
        .order('nombres', { ascending: true });
    setAlumnos(data || []);
    setAlumnoDetalle(null);
    setCargando(false);
  };

  const verFicha = async (alumno: any) => {
    setAlumnoDetalle(alumno);
    
    // Cargar última evaluación para el radar
    const { data: evals } = await supabase.from('evaluaciones_tecnicas')
        .select('*')
        .eq('jugador_id', alumno.id)
        .order('fecha', { ascending: false })
        .limit(1);
    setLastEval(evals?.[0] || null);

    // Cargar historial de puntos reciente
    const { data: logs } = await supabase.from('puntos_log')
        .select('*')
        .eq('jugador_id', alumno.id)
        .order('fecha', { ascending: false })
        .limit(5);
    setPuntosLog(logs || []);
  };

  if (cargando && !catSeleccionada) return <div className="p-20 text-center text-slate-400">Cargando categorías...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
        
        {/* HEADER */}
        <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-2xl text-orange-600">
                    <Users className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Mis Categorías</h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Gestión de Talento Gibbor</p>
                </div>
            </div>
            {catSeleccionada && (
                <button 
                  onClick={() => setCatSeleccionada(null)}
                  className="flex items-center gap-2 text-slate-500 font-bold text-sm bg-slate-100 px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver
                </button>
            )}
        </div>

        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
            {!catSeleccionada ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {categorias.map(cat => (
                        <div key={cat.id} className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all group flex flex-col justify-between h-64">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 font-black text-xl shadow-inner">
                                        {cat.nombre.charAt(0)}
                                    </div>
                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full">{cat.nivel}</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-1">{cat.nombre}</h3>
                                <p className="text-slate-400 text-xs font-medium italic">{cat.horarios || 'Horario por definir'}</p>
                            </div>
                            <button 
                                onClick={() => seleccionarCat(cat)}
                                className="w-full bg-slate-900 group-hover:bg-orange-600 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 italic uppercase tracking-tighter"
                            >
                                Gestionar Grupo <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* LISTA DE ALUMNOS (Columna Izquierda) */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input 
                                type="text" 
                                placeholder="Buscar futbolista..." 
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-3xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
                            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plantilla: {alumnos.length} jugadores</span>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                {alumnos.filter(a => `${a.nombres} ${a.apellidos}`.toLowerCase().includes(busqueda.toLowerCase())).map(a => (
                                    <button 
                                        key={a.id} 
                                        onClick={() => verFicha(a)}
                                        className={`w-full p-5 flex items-center justify-between group hover:bg-orange-50 transition-colors ${alumnoDetalle?.id === a.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs shadow-inner">
                                                {a.nombres.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{a.nombres} {a.apellidos}</p>
                                                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                                    <Trophy className="w-3 h-3 text-orange-400" /> {a.puntos || 0} GP
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${alumnoDetalle?.id === a.id ? 'text-orange-500 translate-x-1' : 'text-slate-200'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* FICHA TÉCNICA (Columna Derecha) */}
                    <div className="lg:col-span-8">
                        {alumnoDetalle ? (
                            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                                
                                {/* Info Principal */}
                                <div className="bg-white rounded-[50px] p-8 border border-slate-200 shadow-xl flex flex-col md:flex-row gap-8 items-center relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4">
                                        <div className="bg-orange-500 text-white font-black italic text-2xl px-6 py-2 rounded-2xl shadow-lg shadow-orange-100">
                                            {alumnoDetalle.puntos || 0} <span className="text-[10px] not-italic block uppercase text-orange-100">Gibbor Points</span>
                                        </div>
                                    </div>

                                    <div className="w-32 h-32 rounded-[40px] bg-slate-900 flex items-center justify-center text-white text-5xl font-black italic shadow-2xl border-4 border-white">
                                        {alumnoDetalle.nombres.charAt(0)}
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase mb-2">{alumnoDetalle.nombres} {alumnoDetalle.apellidos}</h2>
                                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                            <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2"><User className="w-3 h-3" /> ID: {alumnoDetalle.identificacion || '---'}</span>
                                            <span className="bg-orange-50 text-orange-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2"><LayoutGrid className="w-3 h-3" /> {catSeleccionada.nombre}</span>
                                            <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2"><Star className="w-3 h-3" /> {alumnoDetalle.estado_miembro}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Radar Técnico */}
                                    <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm relative group overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 shadow-lg shadow-orange-500/20"></div>
                                        <div className="flex justify-between items-center mb-8">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><RadarIcon className="w-4 h-4 text-orange-500" /> Desempeño Técnico</h3>
                                            {lastEval && <span className="text-[8px] font-black text-slate-400">ÚLT. ACTUALIZACIÓN: {new Date(lastEval.fecha).toLocaleDateString()}</span>}
                                        </div>
                                        
                                        {lastEval ? (
                                            <div className="py-4">
                                                <RadarChart 
                                                    data={Object.entries(lastEval.stats as Record<string, number>).map(([label, value]) => ({ label, value }))}
                                                />
                                                <div className="mt-6 flex justify-center gap-8">
                                                    <div className="text-center">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase">General</p>
                                                        <p className="text-2xl font-black text-slate-800 italic">
  {(() => {
    const data = lastEval as any;
    if (!data || !data.stats) return 0;
    const values = Object.values(data.stats) as number[];
    if (values.length === 0) return 0;
    const total = values.reduce((a, b) => a + b, 0);
    return Math.round(total / values.length);
  })()}
</p>
                                                    </div>
                                                    <div className="w-px h-8 bg-slate-100"></div>
                                                    <div className="text-center">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase">Evaluador</p>
                                                        <p className="text-[10px] font-black text-orange-600 uppercase mt-1">PROFE GIBBOR</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-20 text-center flex flex-col items-center">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                                    <TrendingUp className="w-8 h-8 text-slate-200" />
                                                </div>
                                                <p className="text-slate-400 text-xs font-medium max-w-[200px]">Este jugador aún no tiene evaluaciones técnicas registradas.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Contacto y Log de Puntos */}
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Phone className="w-4 h-4 text-orange-500" /> Información de Contacto</h3>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4 group">
                                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors"><Mail className="w-5 h-5" /></div>
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase">Acudiente</p>
                                                        <p className="text-sm font-bold text-slate-700">{alumnoDetalle.nombre_acudiente || 'No registrado'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 group">
                                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors"><Phone className="w-5 h-5" /></div>
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase">Teléfono</p>
                                                        <p className="text-sm font-bold text-slate-700">{alumnoDetalle.telefono_acudiente || 'Sin teléfono'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Trophy className="w-4 h-4 text-orange-500" /> Actividad Reciente</h3>
                                            <div className="space-y-3">
                                                {puntosLog.map((log, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-700">{log.motivo}</p>
                                                            <p className="text-[8px] text-slate-400 font-bold uppercase">{new Date(log.fecha).toLocaleDateString()}</p>
                                                        </div>
                                                        <span className="bg-orange-100 text-orange-600 font-black text-[10px] px-2 py-1 rounded-lg">+{log.puntos}</span>
                                                    </div>
                                                ))}
                                                {puntosLog.length === 0 && <p className="text-center text-slate-300 text-[10px] py-4 italic">No hay actividad de puntos aún.</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-20 opacity-40">
                                <div className="w-32 h-32 bg-slate-200 rounded-[60px] flex items-center justify-center mb-6">
                                    <User className="w-16 h-16 text-slate-400" />
                                </div>
                                <h3 className="text-2xl font-black italic text-slate-400 tracking-tighter uppercase leading-none">Ficha del Jugador</h3>
                                <p className="text-slate-400 text-xs mt-3 max-w-[250px] font-medium mx-auto">Selecciona un futbolista de la lista lateral para visualizar su ficha técnica completa, radar de habilidades y progreso.</p>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
        `}} />
    </div>
  );
}
