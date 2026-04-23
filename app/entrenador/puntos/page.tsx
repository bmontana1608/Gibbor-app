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

      const { data: usuario } = await supabase.from('perfiles').select('nombres, apellidos, rol, club_id').eq('id', session.user.id).single();
      
      let query = supabase.from('categorias').select('*');
      
      // Si es SuperAdmin o Director, mostramos todas las del club. Si es entrenador, solo las suyas.
      if (usuario?.rol === 'SuperAdmin' || usuario?.rol === 'Director') {
        const clubId = usuario?.club_id;
        if (clubId) query = query.eq('club_id', clubId);
      } else {
        const nombreCompleto = `${usuario?.nombres} ${usuario?.apellidos}`;
        query = query.ilike('entrenadores', `%${nombreCompleto}%`);
      }

      const { data: cats } = await query;
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
      toast.error("Error al cargar puntos.");
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

      toast.success(`¡Felicidades! Se han otorgado puntos con éxito.`, { id: toastId });
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
    const toastId = toast.loading(`Condecorando...`);

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

      toast.success(`¡Insignias otorgadas con éxito!`, { id: toastId });
      setAlumnosSeleccionados([]);
      setInsigniaSeleccionada(null);
    } catch (error: any) {
      toast.error("Error al otorgar: " + error.message, { id: toastId });
    } finally {
      setProcesando(false);
    }
  };

  if (cargando && !catSeleccionada) return <div className="p-20 text-center"><Loader className="animate-spin mx-auto w-10 h-10" style={{ color: 'var(--brand-primary)' }} /></div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-24 animate-in fade-in duration-700">
      
      <div className="flex items-center justify-between border-b border-slate-200 pb-8">
        <div className="flex items-center gap-5">
            <div className="p-4 rounded-[1.5rem] bg-slate-50 border shadow-sm" style={{ color: 'var(--brand-primary)', borderColor: 'rgba(var(--brand-primary-rgb), 0.1)' }}>
                <Trophy className="w-10 h-10" />
            </div>
            <div>
                 <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">Gestión de <span style={{ color: 'var(--brand-primary)' }}>Recompensas</span></h1>
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                    <Star className="w-3 h-3" style={{ color: 'var(--brand-primary)' }} /> Premia el talento y la disciplina
                 </p>
            </div>
        </div>
        <div className="flex flex-col items-end gap-3">
            {catSeleccionada && (
                <button onClick={() => setCatSeleccionada(null)} className="text-slate-400 font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:text-slate-900 transition-colors bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                    <ArrowLeft className="w-3 h-3" /> Volver
                </button>
            )}
            {catSeleccionada && (
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
                    <button onClick={() => setModo('puntos')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modo === 'puntos' ? 'bg-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`} style={modo === 'puntos' ? { color: 'var(--brand-primary)' } : {}}>Puntos</button>
                    <button onClick={() => setModo('insignias')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modo === 'insignias' ? 'bg-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`} style={modo === 'insignias' ? { color: 'var(--brand-primary)' } : {}}>Insignias</button>
                </div>
            )}
        </div>
      </div>

      {!catSeleccionada ? (
        <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Selecciona una Categoría para Premiar</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(categorias.length > 0 ? categorias : []).map(cat => (
                    <button 
                    key={cat.id} 
                    onClick={() => seleccionarCategoria(cat)}
                    className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all flex items-center justify-between group relative overflow-hidden"
                    >
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-slate-50 rounded-full blur-2xl group-hover:bg-slate-100 transition-all"></div>
                    <div className="text-left relative z-10">
                        <p className="font-black text-slate-900 text-xl italic uppercase tracking-tighter leading-none mb-1">{cat.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{cat.nivel || 'Sin Nivel'}</p>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-all z-10" style={{ color: 'var(--brand-primary)' }} />
                    </button>
                ))}
            </div>
            {categorias.length === 0 && (
                <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                    <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-black uppercase text-xs tracking-widest leading-loose">No hay categorías vinculadas a tu perfil.<br/>Asegúrate de estar asignado en la configuración del club.</p>
                </div>
            )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* HERRAMIENTAS DE PREMIACIÓN */}
            <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-8 sticky top-8">
                    {modo === 'puntos' ? (
                        <>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-5 tracking-widest text-center">Valor de la Recompensa</label>
                                <div className="grid grid-cols-3 gap-3">
                                     {[10, 20, 50, 100, 200, 500].map(p => (
                                         <button 
                                            key={p} 
                                            onClick={() => setMontoPuntos(p)}
                                            className={`py-4 rounded-2xl font-black text-xs transition-all border ${montoPuntos === p ? 'text-white border-transparent shadow-lg' : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100'}`}
                                            style={montoPuntos === p ? { backgroundColor: 'var(--brand-primary)', boxShadow: `0 8px 20px -5px rgba(var(--brand-primary-rgb), 0.4)` } : {}}
                                         >+{p}</button>
                                     ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-5 tracking-widest text-center">Motivo</label>
                                <select 
                                    value={razon} 
                                    onChange={(e) => setRazon(e.target.value)}
                                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition-all appearance-none"
                                >
                                    {razonesComunes.map(r => <option key={r} value={r}>{r}</option>)}
                                    <option value="Personalizado">Otro (Personalizado)</option>
                                </select>
                            </div>

                            <button 
                                onClick={asignarPuntos}
                                disabled={procesando || alumnosSeleccionados.length === 0}
                                className="w-full bg-slate-900 hover:bg-black text-white py-6 rounded-[1.5rem] font-black shadow-2xl transition-all disabled:opacity-20 disabled:grayscale uppercase tracking-widest text-xs italic"
                            >
                                {procesando ? 'PROCESANDO...' : 'OTORGAR PUNTOS ⚡'}
                            </button>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest text-center">Selecciona Condecoración</label>
                                <div className="grid grid-cols-1 gap-4">
                                     {insigniasDisponibles.map(ins => (
                                         <button 
                                            key={ins.id} 
                                            onClick={() => setInsigniaSeleccionada(ins)}
                                            className={`flex items-center gap-4 p-4 rounded-[1.5rem] text-left transition-all border ${insigniaSeleccionada?.id === ins.id ? 'bg-slate-900 border-slate-900 shadow-2xl scale-[1.02]' : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-200'}`}
                                         >
                                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${ins.color} flex items-center justify-center text-2xl shadow-inner`}>
                                                {ins.icono}
                                            </div>
                                            <div>
                                                <p className={`text-xs font-black uppercase italic tracking-tighter ${insigniaSeleccionada?.id === ins.id ? 'text-white' : 'text-slate-900'}`}>{ins.nombre}</p>
                                                <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${insigniaSeleccionada?.id === ins.id ? 'text-slate-400' : 'text-slate-500'}`}>{ins.desc}</p>
                                            </div>
                                         </button>
                                     ))}
                                </div>
                            </div>

                            <button 
                                onClick={otorgarInsignias}
                                disabled={procesando || alumnosSeleccionados.length === 0 || !insigniaSeleccionada}
                                className="w-full text-white py-6 rounded-[1.5rem] font-black shadow-2xl transition-all disabled:opacity-20 disabled:grayscale uppercase tracking-widest text-xs italic"
                                style={{ backgroundColor: 'var(--brand-primary)', boxShadow: `0 12px 24px -6px rgba(var(--brand-primary-rgb), 0.4)` }}
                            >
                                {procesando ? 'CONDECORANDO...' : 'OTORGAR INSIGNIA 🏅'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* LISTA DE ALUMNOS */}
            <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-slate-900 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Buscar futbolista de la categoría..." 
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-16 pr-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] text-sm font-bold outline-none shadow-sm focus:shadow-xl focus:border-slate-300 transition-all"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-3 custom-scrollbar">
                    {alumnos.length === 0 ? (
                        <div className="col-span-full py-24 text-center bg-white border-2 border-dashed border-slate-50 rounded-[3rem]">
                            <UsersIcon className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No hay futbolistas registrados en "{catSeleccionada.nombre}"</p>
                            <p className="text-slate-300 text-[10px] mt-2 font-bold uppercase tracking-tighter">Verifica el grupo en los perfiles de los alumnos</p>
                        </div>
                    ) : (
                        alumnos.filter(a => `${a.nombres} ${a.apellidos}`.toLowerCase().includes(busqueda.toLowerCase())).map(alumno => {
                            const seleccionado = alumnosSeleccionados.includes(alumno.id);
                            return (
                                <button 
                                    key={alumno.id} 
                                    onClick={() => toggleSeleccion(alumno.id)}
                                    className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between text-left group overflow-hidden relative ${seleccionado ? 'border-transparent shadow-xl' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    style={seleccionado ? { backgroundColor: 'white', border: `2px solid var(--brand-primary)` } : {}}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-colors ${seleccionado ? 'text-white' : 'bg-slate-50 text-slate-300'}`} style={seleccionado ? { backgroundColor: 'var(--brand-primary)' } : {}}>
                                            {alumno.nombres.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-sm uppercase italic tracking-tighter leading-none mb-1">{alumno.nombres} {alumno.apellidos}</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-2 italic">
                                                <Star className="w-3 h-3" style={{ color: 'var(--brand-primary)' }} /> {alumno.puntos || 0} Points
                                            </p>
                                        </div>
                                    </div>
                                    {seleccionado && <CheckCircle2 className="w-6 h-6 z-10" style={{ color: 'var(--brand-primary)' }} />}
                                    <div className="absolute right-0 top-0 w-20 h-full opacity-[0.03] flex items-center justify-center pointer-events-none">
                                        <Trophy size={48} />
                                    </div>
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
