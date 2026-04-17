'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trophy, Star, Award, Zap, ChevronRight, 
  Search, CheckCircle2, Loader, ArrowLeft, Users as UsersIcon 
} from 'lucide-react';
import { toast } from 'sonner';

export default function AsignarPuntosGibbor() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [catSeleccionada, setCatSeleccionada] = useState<any>(null);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Estados para la asignación
  const [modo, setModo] = useState<'puntos' | 'insignias'>('puntos');
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState<string[]>([]);
  const [montoPuntos, setMontoPuntos] = useState(10);
  const [razon, setRazon] = useState('Puntualidad y Disciplina');
  const [insigniaSeleccionada, setInsigniaSeleccionada] = useState<any>(null);

  const insigniasDisponibles = [
    { id: 'goleador', nombre: 'Goleador Élite', icono: '⚽', color: 'from-orange-400 to-red-500', desc: 'Máximo artillero' },
    { id: 'muro', nombre: 'Muro Defensivo', icono: '🛡️', color: 'from-blue-500 to-indigo-700', desc: 'Defensa impenetrable' },
    { id: 'cerebro', nombre: 'Cerebro del Campo', icono: '🧠', color: 'from-purple-500 to-pink-600', desc: 'Visión de juego superior' },
    { id: 'fairplay', nombre: 'Espíritu Gibbor', icono: '🤝', color: 'from-green-400 to-emerald-600', desc: 'Compañerismo y valores' },
    { id: 'rayo', nombre: 'Rayo Veloz', icono: '⚡', color: 'from-yellow-400 to-orange-500', desc: 'Velocidad explosiva' }
  ];

  const razonesComunes = [
    'Puntualidad y Disciplina',
    'Esfuerzo en el entrenamiento',
    'Compañerismo / Fair Play',
    'Gol del entrenamiento',
    'Mejorada técnica individual',
    'Portería en cero (Arqueros)'
  ];

  useEffect(() => {
    async function cargarCategorias() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: usuario } = await supabase.from('perfiles').select('nombres, apellidos').eq('id', session.user.id).single();
      const nombreCompleto = `${usuario?.nombres} ${usuario?.apellidos}`;

      const { data: cats } = await supabase.from('categorias').select('*').ilike('entrenadores', `%${nombreCompleto}%`);
      setCategorias(cats || []);
      setCargando(false);
    }
    cargarCategorias();
  }, []);

  const seleccionarCategoria = async (cat: any) => {
    setCargando(true);
    setCatSeleccionada(cat);
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombres, apellidos, puntos, estado_miembro')
      .eq('rol', 'Futbolista')
      .ilike('grupos', `%${cat.nombre}%`);
    
    if (error) {
      toast.error("Error al cargar puntos: Asegúrate de tener la columna 'puntos' (tipo int8) en tu tabla 'perfiles'.");
      console.error(error);
    }
    
    setAlumnos(data || []);
    setAlumnosSeleccionados([]);
    setCargando(false);
  };

  const toggleSeleccion = (id: string) => {
    setAlumnosSeleccionados(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const asignarPuntos = async () => {
    if (alumnosSeleccionados.length === 0) return toast.error("Selecciona al menos un futbolista");
    setProcesando(true);
    const toastId = toast.loading(`Asignando +${montoPuntos} puntos...`);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('perfiles').select('nombres, apellidos').eq('id', user?.id).single();

      const res = await fetch('/api/recompensas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'puntos',
          jugadorIds: alumnosSeleccionados,
          monto: montoPuntos,
          motivo: razon,
          otorgadoPor: `${prof?.nombres} ${prof?.apellidos}`
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success(`¡Felicidades! Se han otorgado ${montoPuntos} Gibbor Points.`, { id: toastId });
      setAlumnosSeleccionados([]);
      seleccionarCategoria(catSeleccionada);
    } catch (error: any) {
      toast.error("Error: " + error.message, { id: toastId });
    } finally {
      setProcesando(false);
    }
  };

  const otorgarInsignias = async () => {
    if (alumnosSeleccionados.length === 0) return toast.error("Selecciona al menos un futbolista");
    if (!insigniaSeleccionada) return toast.error("Selecciona una insignia");
    setProcesando(true);
    const toastId = toast.loading(`Condecorando con ${insigniaSeleccionada.nombre}...`);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('perfiles').select('nombres, apellidos').eq('id', user?.id).single();

      const res = await fetch('/api/recompensas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'insignia',
          jugadorIds: alumnosSeleccionados,
          insigniaId: insigniaSeleccionada.id,
          otorgadoPor: `${prof?.nombres} ${prof?.apellidos}`
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success(`¡Misión cumplida! Insignias otorgadas con éxito.`, { id: toastId });
      setAlumnosSeleccionados([]);
      setInsigniaSeleccionada(null);
    } catch (error: any) {
      toast.error("Error al otorgar: " + error.message, { id: toastId });
    } finally {
      setProcesando(false);
    }
  };

  if (cargando && !catSeleccionada) return <div className="p-20 text-center"><Loader className="animate-spin mx-auto w-10 h-10 text-orange-500" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-24">
      
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
            <Trophy className="w-10 h-10 text-orange-500" />
            <div>
                 <h1 className="text-2xl font-black text-slate-800 tracking-tight text-orange-600">Recompensas Gibbor 🏆</h1>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Premia el talento y el honor</p>
            </div>
        </div>
        <div className="flex flex-col items-end gap-2">
            {catSeleccionada && (
                <button onClick={() => setCatSeleccionada(null)} className="text-slate-400 font-bold text-sm flex items-center gap-1 hover:text-orange-500 transition-colors"><ArrowLeft className="w-4 h-4" /> Volver a Categorías</button>
            )}
            {catSeleccionada && (
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setModo('puntos')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${modo === 'puntos' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Puntos</button>
                    <button onClick={() => setModo('insignias')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${modo === 'insignias' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Insignias</button>
                </div>
            )}
        </div>
      </div>

      {!catSeleccionada ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categorias.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => seleccionarCategoria(cat)}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-orange-500 hover:shadow-xl transition-all flex items-center justify-between group"
                >
                  <div className="text-left">
                    <p className="font-black text-slate-800 text-lg">{cat.nombre}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase">{cat.nivel}</p>
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                </button>
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* HERRAMIENTAS DE PREMIACIÓN */}
            <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-8 sticky top-8">
                    {modo === 'puntos' ? (
                        <>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-tighter">Valor de la Recompensa</label>
                                <div className="grid grid-cols-3 gap-2">
                                     {[10, 20, 50, 100, 200, 500].map(p => (
                                         <button 
                                            key={p} 
                                            onClick={() => setMontoPuntos(p)}
                                            className={`py-4 rounded-2xl font-black text-xs transition-all ${montoPuntos === p ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                         >+{p}</button>
                                     ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-tighter">Motivo del Reconocimiento</label>
                                <select 
                                    value={razon} 
                                    onChange={(e) => setRazon(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    {razonesComunes.map(r => <option key={r} value={r}>{r}</option>)}
                                    <option value="Personalizado">Otro (Personalizado)</option>
                                </select>
                            </div>

                            <button 
                                onClick={asignarPuntos}
                                disabled={procesando || alumnosSeleccionados.length === 0}
                                className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black shadow-xl transition-all disabled:opacity-30 disabled:grayscale uppercase tracking-widest text-xs"
                            >
                                {procesando ? 'PROCESANDO...' : 'OTORGAR PUNTOS ⚡'}
                            </button>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-tighter">Selecciona una Insignia</label>
                                <div className="grid grid-cols-1 gap-3">
                                     {insigniasDisponibles.map(ins => (
                                         <button 
                                            key={ins.id} 
                                            onClick={() => setInsigniaSeleccionada(ins)}
                                            className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all border ${insigniaSeleccionada?.id === ins.id ? 'bg-slate-900 border-slate-900 shadow-xl' : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-200'}`}
                                         >
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ins.color} flex items-center justify-center text-xl shadow-inner`}>
                                                {ins.icono}
                                            </div>
                                            <div>
                                                <p className={`text-xs font-black uppercase tracking-tight ${insigniaSeleccionada?.id === ins.id ? 'text-white' : 'text-slate-800'}`}>{ins.nombre}</p>
                                                <p className={`text-[10px] font-medium leading-none mt-1 ${insigniaSeleccionada?.id === ins.id ? 'text-slate-400' : 'text-slate-500'}`}>{ins.desc}</p>
                                            </div>
                                         </button>
                                     ))}
                                </div>
                            </div>

                            <button 
                                onClick={otorgarInsignias}
                                disabled={procesando || alumnosSeleccionados.length === 0 || !insigniaSeleccionada}
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-5 rounded-2xl font-black shadow-xl transition-all disabled:opacity-30 disabled:grayscale uppercase tracking-widest text-xs"
                            >
                                {procesando ? 'CONDECORANDO...' : 'OTORGAR INSIGNIA 🏅'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* LISTA DE ALUMNOS */}
            <div className="lg:col-span-2 space-y-4 order-1 lg:order-2">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre..." 
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-500"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {alumnos.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-100 rounded-[40px]">
                            <UsersIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold text-sm">No hay futbolistas en esta categoría.</p>
                            <p className="text-slate-300 text-[10px] mt-1 max-w-[200px] mx-auto">Asegúrate de que los alumnos tengan asignado el grupo "{catSeleccionada.nombre}" en su perfil.</p>
                        </div>
                    ) : (
                        alumnos.filter(a => `${a.nombres} ${a.apellidos}`.toLowerCase().includes(busqueda.toLowerCase())).map(alumno => {
                            const seleccionado = alumnosSeleccionados.includes(alumno.id);
                            return (
                                <button 
                                    key={alumno.id} 
                                    onClick={() => toggleSeleccion(alumno.id)}
                                    className={`p-4 rounded-3xl border transition-all flex items-center justify-between text-left ${seleccionado ? 'bg-orange-50 border-orange-500 shadow-md' : 'bg-white border-slate-100 hover:border-orange-200'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${seleccionado ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            {alumno.nombres.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{alumno.nombres} {alumno.apellidos}</p>
                                            <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 italic"><Star className="w-3 h-3 text-orange-400" /> {alumno.puntos || 0} Acumulados</p>
                                        </div>
                                    </div>
                                    {seleccionado && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

        </div>
      )}

    </div>
  );
}
