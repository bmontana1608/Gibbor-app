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
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState<string[]>([]);
  const [montoPuntos, setMontoPuntos] = useState(10);
  const [razon, setRazon] = useState('Puntualidad y Disciplina');

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
      // 1. Obtener datos del profesor
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('perfiles').select('nombres, apellidos').eq('id', user?.id).single();

      // 2. Realizar actualizaciones masivas (Nota: Supabase no soporta increment masivo con .update fácilmente sin RPC, 
      // así que lo haremos secuencial o uno por uno para asegurar consistencia si no hay RPC configurado)
      // Usaremos un bucle simple para esta versión, pero en prod se recomienda un RPC.
      
      for (const id of alumnosSeleccionados) {
        const alumno = alumnos.find(a => a.id === id);
        const puntosActuales = alumno?.puntos || 0;
        
        // Actualizar perfil
        await supabase.from('perfiles').update({ puntos: puntosActuales + montoPuntos }).eq('id', id);
        
        // Guardar en log (si la tabla existe)
        await supabase.from('puntos_log').insert([{
          jugador_id: id,
          puntos: montoPuntos,
          motivo: razon,
          otorgado_por: `${prof?.nombres} ${prof?.apellidos}`,
          fecha: new Date().toISOString()
        }]);
      }

      toast.success(`¡Felicidades! Se han otorgado ${montoPuntos} Gibbor Points.`, { id: toastId });
      setAlumnosSeleccionados([]);
      // Recargar datos
      seleccionarCategoria(catSeleccionada);

    } catch (error: any) {
      toast.error("Error: " + error.message, { id: toastId });
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
                 <h1 className="text-2xl font-black text-slate-800 tracking-tight text-orange-600">Gibbor Points 🏆</h1>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Premia el talento y la disciplina</p>
            </div>
        </div>
        {catSeleccionada && (
            <button onClick={() => setCatSeleccionada(null)} className="text-slate-400 font-bold text-sm flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Categorías</button>
        )}
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
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3">Valor del Premio</label>
                        <div className="grid grid-cols-3 gap-2">
                             {[10, 20, 50, 100, 200, 500].map(p => (
                                 <button 
                                    key={p} 
                                    onClick={() => setMontoPuntos(p)}
                                    className={`py-3 rounded-2xl font-black text-xs transition-all ${montoPuntos === p ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                 >+{p}</button>
                             ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3">Motivo del Reconocimiento</label>
                        <select 
                            value={razon} 
                            onChange={(e) => setRazon(e.target.value)}
                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            {razonesComunes.map(r => <option key={r} value={r}>{r}</option>)}
                            <option value="Personalizado">Otro (Personalizado)</option>
                        </select>
                        {razon === 'Personalizado' && (
                             <input type="text" placeholder="Escribe el motivo..." className="mt-2 w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500" />
                        )}
                    </div>

                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <p className="text-[10px] font-black text-orange-700 mb-1 uppercase">Resumen</p>
                        <p className="text-xs text-orange-800 font-medium leading-relaxed">Asignando <span className="font-black">+{montoPuntos} GP</span> a <span className="font-black text-orange-600">{alumnosSeleccionados.length} futbolistas</span> por <span className="font-black italic">"{razon}"</span>.</p>
                    </div>

                    <button 
                        onClick={asignarPuntos}
                        disabled={procesando || alumnosSeleccionados.length === 0}
                        className="w-full bg-slate-800 hover:bg-black text-white py-5 rounded-2xl font-black shadow-xl transition-all disabled:opacity-30 disabled:grayscale"
                    >
                        {procesando ? 'PROCESANDO...' : 'OTORGAR PUNTOS ⚡'}
                    </button>
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
