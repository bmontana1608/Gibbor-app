'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ClipboardCheck, UserCheck, ChevronRight, Save, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function AsistenciaEntrenador() {
  const [perfil, setPerfil] = useState<any>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<any>(null);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [asistencia, setAsistencia] = useState<Record<string, string>>({}); // { alumnoId: 'Presente' }
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function inicializar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: usuario } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (usuario) {
        setPerfil(usuario);
        const nombreCompleto = `${usuario.nombres} ${usuario.apellidos}`;
        
        // Cargar categorías donde aparece el entrenador
        const { data: cats } = await supabase
          .from('categorias')
          .select('*')
          .filter('entrenadores', 'ilike', `%${nombreCompleto}%`);
        
        if (cats) setCategorias(cats);
      }
      setCargando(false);
    }
    inicializar();
  }, []);

  const seleccionarCategoria = async (cat: any) => {
    setCargando(true);
    setCategoriaSeleccionada(cat);
    
    // Cargar alumnos de esa categoría
    const { data: jugs } = await supabase
      .from('perfiles')
      .select('id, nombres, apellidos, grupos')
      .eq('rol', 'Futbolista')
      .eq('grupos', cat.nombre)
      .neq('estado_miembro', 'Inactivo');
    
    if (jugs) {
      setAlumnos(jugs);
      // Inicializar asistencia como 'Presente' por defecto (ahorra clics)
      const inicial: Record<string, string> = {};
      jugs.forEach(j => inicial[j.id] = 'Presente');
      setAsistencia(inicial);
    }
    setCargando(false);
  };

  const marcarEstado = (alumnoId: string, estado: string) => {
    setAsistencia(prev => ({ ...prev, [alumnoId]: estado }));
  };

  const guardarAsistencia = async () => {
    if (!categoriaSeleccionada) return;
    setGuardando(true);
    const toastId = toast.loading("Guardando lista de asistencia...");

    const hoy = new Date().toISOString().split('T')[0];
    const registros = alumnos.map(alumno => ({
      jugador_id: alumno.id,
      grupo: categoriaSeleccionada.nombre,
      estado: asistencia[alumno.id],
      fecha: hoy,
      registrado_por: `${perfil.nombres} ${perfil.apellidos}`
    }));

    const { error } = await supabase.from('asistencias').insert(registros);

    if (error) {
      toast.error("Error al guardar: " + error.message, { id: toastId });
    } else {
      toast.success("¡Asistencia guardada correctamente!", { id: toastId });
      setCategoriaSeleccionada(null);
    }
    setGuardando(false);
  };

  if (cargando && !categoriaSeleccionada) return <div className="p-8 text-center text-slate-400">Cargando tus grupos...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
          <ClipboardCheck className="w-8 h-8 text-orange-500" /> Control de Asistencia
        </h1>
        <p className="text-slate-500 mt-1">Registra la participación de tus jugadores hoy.</p>
      </div>

      {!categoriaSeleccionada ? (
        <div className="space-y-4">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Selecciona una Categoría para comenzar:</p>
          <div className="grid grid-cols-1 gap-4">
            {categorias.length === 0 ? (
              <div className="bg-white p-10 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No tienes categorías asignadas actualmente.</p>
              </div>
            ) : (
              categorias.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => seleccionarCategoria(cat)}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-orange-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 font-black">
                      {cat.nombre.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-800">{cat.nombre}</p>
                      <p className="text-xs text-slate-500">{cat.nivel} • {cat.horarios || 'Horario no definido'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCategoriaSeleccionada(null)}
                className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div>
                <h2 className="font-black text-slate-800 text-lg">{categoriaSeleccionada.nombre}</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}</p>
              </div>
            </div>
            <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
               <UserCheck className="w-3.5 h-3.5" /> En Clase: {alumnos.length}
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {alumnos.map((alumno) => (
              <div key={alumno.id} className="p-4 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-sm">
                    {alumno.nombres.charAt(0)}
                  </div>
                  <p className="font-bold text-slate-800 group-hover:text-orange-600 transition-colors uppercase text-sm tracking-tight">{alumno.nombres} {alumno.apellidos}</p>
                </div>
                
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button 
                    onClick={() => marcarEstado(alumno.id, 'Presente')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${asistencia[alumno.id] === 'Presente' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    PRE
                  </button>
                  <button 
                    onClick={() => marcarEstado(alumno.id, 'Ausente')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${asistencia[alumno.id] === 'Ausente' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    AUS
                  </button>
                  <button 
                    onClick={() => marcarEstado(alumno.id, 'Excusa')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${asistencia[alumno.id] === 'Excusa' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    EXC
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200">
            <button 
              onClick={guardarAsistencia}
              disabled={guardando || alumnos.length === 0}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-100 flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.01]"
            >
              {guardando ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {guardando ? 'GURDANDO...' : 'FINALIZAR REGISTRO'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
