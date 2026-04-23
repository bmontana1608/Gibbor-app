'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardCheck, UserCheck, ChevronRight, Save, Loader, 
  AlertCircle, X, Trophy, Calendar, MapPin, Clock, 
  ArrowLeft, Search, Plus, Filter, Users
} from 'lucide-react';
import { toast } from 'sonner';

type Paso = 'categorias' | 'eventos' | 'asistencia';

export default function AsistenciaEntrenador() {
  const [paso, setPaso] = useState<Paso>('categorias');
  const [perfil, setPerfil] = useState<any>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<any>(null);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [asistencia, setAsistencia] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    async function inicializar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: usuario } = await supabase.from('perfiles').select('*').eq('id', session.user.id).single();
      if (usuario) {
        setPerfil(usuario);
        
        // Usar API interna para saltar RLS
        try {
          const res = await fetch(`/api/categorias?club_id=${usuario.club_id}&entrenador_id=${usuario.id}`);
          const cats = await res.json();
          if (Array.isArray(cats)) setCategorias(cats);
        } catch (err) {
          console.error("Error cargando categorías:", err);
          toast.error("Error al cargar categorías");
        }
      }
      setCargando(false);
    }
    inicializar();
  }, []);

  const seleccionarCategoria = async (cat: any) => {
    setCargando(true);
    setCategoriaSeleccionada(cat);
    
    // Cargar eventos (hoy y futuros) para esta categoría
    const hoy = new Date().toISOString().split('T')[0];
    const { data: evs } = await supabase
      .from('eventos')
      .select('*')
      .eq('fecha', hoy)
      .or(`categoria_id.eq.${cat.id},categoria_id.is.null`);

    setEventos(evs || []);
    setPaso('eventos');
    setCargando(false);
  };

  const seleccionarEvento = async (ev: any) => {
    setCargando(true);
    setEventoSeleccionado(ev);
    
    // Cargar alumnos
    const { data: jugs } = await supabase
      .from('perfiles')
      .select('id, nombres, apellidos, grupos, foto_url')
      .eq('rol', 'Futbolista')
      .eq('grupos', categoriaSeleccionada.nombre)
      .neq('estado_miembro', 'Inactivo');
    
    if (jugs) {
      setAlumnos(jugs);
      const inicial: Record<string, string> = {};
      jugs.forEach(j => inicial[j.id] = 'Presente');
      setAsistencia(inicial);
    }
    setPaso('asistencia');
    setCargando(false);
  };

  const crearSesionRapida = async () => {
    setCargando(true);
    const hoy = new Date().toISOString().split('T')[0];
    const nuevaSesion = {
      titulo: `Entrenamiento - ${categoriaSeleccionada.nombre}`,
      tipo: 'Entrenamiento',
      fecha: hoy,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      categoria_id: categoriaSeleccionada.id,
      club_id: perfil?.club_id
    };

    const { data, error } = await supabase.from('eventos').insert([nuevaSesion]).select().single();
    if (data) {
      seleccionarEvento(data);
    } else {
      toast.error("Error al crear sesión rápida");
      setCargando(false);
    }
  };

  const marcarEstado = (alumnoId: string, estado: string) => {
    setAsistencia(prev => ({ ...prev, [alumnoId]: estado }));
  };

  const guardarAsistencia = async () => {
    setGuardando(true);
    const toastId = toast.loading("Sincronizando asistencia...");

    const registros = alumnos.map(alumno => {
      const registro: any = {
        jugador_id: alumno.id,
        grupo: categoriaSeleccionada.nombre,
        estado: asistencia[alumno.id],
        fecha: eventoSeleccionado.fecha,
        registrado_por: `${perfil.nombres} ${perfil.apellidos}`,
        club_id: perfil?.club_id
      };
      
      // Solo enviamos evento_id si existe la intención (se añadirá la columna en SQL)
      if (eventoSeleccionado.id) registro.evento_id = eventoSeleccionado.id;
      
      return registro;
    });

    const { error } = await supabase.from('asistencias').insert(registros);

    if (error) {
       toast.error("Error al guardar: " + error.message, { id: toastId });
    } else {
       toast.success("¡Asistencia guardada con éxito!", { id: toastId });
       setPaso('categorias');
       setCategoriaSeleccionada(null);
       setEventoSeleccionado(null);
    }
    setGuardando(false);
  };

  const filtrados = alumnos.filter(a => 
    `${a.nombres} ${a.apellidos}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* HEADER DE LA PÁGINA */}
      <div className="max-w-5xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             {paso !== 'categorias' && (
               <button 
                 onClick={() => setPaso(paso === 'asistencia' ? 'eventos' : 'categorias')}
                 className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-orange-500 transition-all mr-2"
               >
                 <ArrowLeft className="w-5 h-5" />
               </button>
             )}
             <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-3">
               <ClipboardCheck className="w-8 h-8 text-orange-500" /> Control Táctico
             </h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            {paso === 'categorias' && "Selecciona la categoría a cargo"}
            {paso === 'eventos' && `Sesiones para ${categoriaSeleccionada?.nombre}`}
            {paso === 'asistencia' && `Pasando lista: ${eventoSeleccionado?.titulo}`}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        
        {/* PASO 1: CATEGORÍAS */}
        {paso === 'categorias' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categorias.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => seleccionarCategoria(cat)}
                className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-orange-500/50 hover:-translate-y-1 transition-all text-left relative group overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-orange-500/10 transition-colors" />
                
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-600 font-black text-2xl shadow-inner shadow-orange-500/5">
                    {cat.nombre.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter">{cat.nombre}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{cat.nivel || 'Nivel Formativo'}</p>
                    <div className="flex items-center gap-2 mt-4 text-slate-500 text-xs font-bold">
                       <Clock className="w-3.5 h-3.5 text-orange-500" /> {cat.horarios || 'Horario flexible'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* PASO 2: EVENTOS / SESIONES */}
        {paso === 'eventos' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventos.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center col-span-full">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold italic mb-6">No hay sesiones programadas para hoy</p>
                  <button 
                    onClick={crearSesionRapida}
                    className="bg-slate-900 dark:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                  >
                    Crear Sesión de Entrenamiento
                  </button>
                </div>
              ) : (
                <>
                  {eventos.map(ev => (
                    <button 
                      key={ev.id} 
                      onClick={() => seleccionarEvento(ev)}
                      className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex items-center gap-5 hover:border-orange-500 shadow-sm transition-all text-left"
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${ev.tipo === 'Partido' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                         {ev.tipo === 'Partido' ? <Trophy className="w-7 h-7" /> : <ClipboardCheck className="w-7 h-7" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{ev.tipo}</p>
                        <h4 className="font-black text-slate-800 dark:text-white uppercase italic text-sm">{ev.titulo}</h4>
                        <div className="flex items-center gap-3 mt-2">
                           <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500"><Clock className="w-3 h-3" /> {ev.hora}</span>
                           <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500"><MapPin className="w-3 h-3" /> Sede Principal</span>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-slate-300" />
                    </button>
                  ))}
                  <button 
                    onClick={crearSesionRapida}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] flex items-center justify-center gap-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-white dark:hover:bg-slate-900 hover:text-orange-500 transition-all"
                  >
                    <Plus className="w-5 h-5" /> Nueva Sesión
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* PASO 3: LISTADO DE ASISTENCIA */}
        {paso === 'asistencia' && (
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            
            {/* Cabecera del Listado */}
            <div className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
               <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm">
                      <Users className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-xl uppercase italic tracking-tighter">Lista de Jugadores</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> {filtrados.length} Deportistas Convocados
                      </p>
                    </div>
                  </div>
                  <div className="relative flex-1 max-w-xs ml-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Filtrar por nombre..." 
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                    />
                  </div>
               </div>
            </div>

            {/* Lista Real */}
            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
               {filtrados.length === 0 ? (
                 <div className="p-20 text-center text-slate-400 font-bold italic">No se encontraron jugadores</div>
               ) : (
                filtrados.map((alumno) => (
                  <div key={alumno.id} className="p-4 md:p-6 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                         {alumno.foto_url ? (
                           <img src={alumno.foto_url} alt="Profile" className="w-full h-full object-cover" />
                         ) : (
                           <span className="font-black text-slate-400 text-lg uppercase">{alumno.nombres.charAt(0)}</span>
                         )}
                       </div>
                       <div>
                         <p className="font-black text-slate-800 dark:text-white uppercase italic text-sm md:text-base group-hover:text-orange-500 transition-colors">{alumno.nombres} {alumno.apellidos}</p>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{alumno.grupos || 'Sub-15'}</p>
                       </div>
                    </div>

                    <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <button 
                        onClick={() => marcarEstado(alumno.id, 'Presente')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${asistencia[alumno.id] === 'Presente' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-emerald-500'}`}
                      >
                        {asistencia[alumno.id] === 'Presente' ? 'Asiste' : 'Ok'}
                      </button>
                      <button 
                        onClick={() => marcarEstado(alumno.id, 'Ausente')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${asistencia[alumno.id] === 'Ausente' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-rose-500'}`}
                      >
                        {asistencia[alumno.id] === 'Ausente' ? 'Falta' : 'F'}
                      </button>
                      <button 
                         onClick={() => marcarEstado(alumno.id, 'Excusa')}
                         className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${asistencia[alumno.id] === 'Excusa' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-amber-500'}`}
                      >
                        {asistencia[alumno.id] === 'Excusa' ? 'Exc' : 'E'}
                      </button>
                    </div>
                  </div>
                ))
               )}
            </div>

            {/* Footer de Listado */}
            <div className="p-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Presentes</p>
                    <p className="text-2xl font-black text-emerald-500">{Object.values(asistencia).filter(a => a === 'Presente').length}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Inasistencias</p>
                    <p className="text-2xl font-black text-rose-500">{Object.values(asistencia).filter(a => a === 'Ausente').length}</p>
                  </div>
               </div>
               
               <button 
                 onClick={guardarAsistencia}
                 disabled={guardando || alumnos.length === 0}
                 className="w-full md:w-auto bg-slate-900 dark:bg-orange-600 text-white px-12 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-orange-500/20 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
               >
                 {guardando ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                 {guardando ? 'Sincronizando...' : 'Finalizar sesión de entrenamiento'}
               </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
