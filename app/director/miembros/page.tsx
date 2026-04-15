'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, Download, UserPlus, Search, ChevronDown, Check, X, User } from 'lucide-react';
import { toast } from 'sonner';

export default function DirectorioMiembros() {
  const router = useRouter();
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [busqueda, setBusqueda] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('Todos');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos'); 
  
  const [pestaña, setPestaña] = useState<'Registrados' | 'Pendientes'>('Registrados');

  const cargarJugadores = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .not('rol', 'in', '("Director","Entrenador")')
      .order('nombres', { ascending: true });

    if (error) {
       toast.error(`Error de conexión: ${error.message}`);
    } else if (data) {
       setJugadores(data);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarJugadores();
  }, []);

  const aprobarJugador = async (id: string, nombreCompleto: string) => {
    const toastId = toast.loading(`Aprobando a ${nombreCompleto}...`);
    const { error } = await supabase.from('perfiles').update({ estado_miembro: 'Activo' }).eq('id', id);
    
    if (!error) {
      toast.success(`${nombreCompleto} ha sido aprobado e ingresado al club.`, { id: toastId });
      cargarJugadores();
    } else {
      toast.error('Error al aprobar: ' + error.message, { id: toastId });
    }
  };

  const rechazarJugador = async (id: string, nombreCompleto: string) => {
    const confirmacion = window.confirm(`¿Estás seguro de RECHAZAR y eliminar la solicitud de ${nombreCompleto}?`);
    if (!confirmacion) return;

    const toastId = toast.loading(`Eliminando solicitud de ${nombreCompleto}...`);
    const { error } = await supabase.from('perfiles').delete().eq('id', id);
    
    if (!error) {
      toast.success(`La solicitud ha sido eliminada.`, { id: toastId });
      cargarJugadores();
    } else {
      toast.error('Error al eliminar: ' + error.message, { id: toastId });
    }
  };

  const jugadoresRegistrados = jugadores.filter(j => j.estado_miembro !== 'Pendiente');
  const solicitudesPendientes = jugadores.filter(j => j.estado_miembro === 'Pendiente');

  const listaAVisualizar = pestaña === 'Registrados' ? jugadoresRegistrados : solicitudesPendientes;
  
  const jugadoresFiltrados = listaAVisualizar.filter(jugador => {
    const coincideGrupo = grupoFiltro === 'Todos' || jugador.grupos === grupoFiltro;
    const estadoReal = jugador.estado_miembro || 'Activo';
    const coincideEstado = estadoFiltro === 'Todos' || estadoReal === estadoFiltro;
    const nombreCompleto = `${jugador.nombres} ${jugador.apellidos}`.toLowerCase();
    const coincideBusqueda = nombreCompleto.includes(busqueda.toLowerCase());
    
    return coincideGrupo && coincideBusqueda && coincideEstado;
  });

  const gruposDisponibles = ['Todos', ...Array.from(new Set(jugadoresRegistrados.map(j => j.grupos).filter(Boolean)))];

  const exportarAExcel = () => {
    if (jugadoresFiltrados.length === 0) return toast.error("No hay datos para exportar");
    const cabeceras = ['Nombres', 'Apellidos', 'Documento', 'Categoria', 'Telefono', 'Estado del Jugador', 'Estado de Pago'];
    const filas = jugadoresFiltrados.map(j => [
      `"${j.nombres || ''}"`, `"${j.apellidos || ''}"`, `"${j.documento_identidad || ''}"`,
      `"${j.grupos || 'Sin Asignar'}"`, `"${j.telefono || ''}"`, `"${j.estado_miembro || 'Activo'}"`, `"${j.estado_pago || 'Pendiente'}"`
    ]);
    const contenidoCSV = [cabeceras.join(';'), ...filas.map(f => f.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Directorio_Gibbor.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success("Archivo Excel exportado exitosamente");
  };

  const getInicial = (nombre: string) => nombre ? nombre.charAt(0).toUpperCase() : '?';

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-orange-500 w-7 h-7" /> Directorio de Miembros
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de jugadores y solicitudes.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportarAExcel} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
          <button onClick={() => router.push('/director/miembros/nuevo')} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-colors">
            <UserPlus className="w-4 h-4" /> Nuevo Miembro
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-px">
        <button onClick={() => setPestaña('Registrados')} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${pestaña === 'Registrados' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Plantilla Oficial ({cargando ? '...' : jugadoresRegistrados.length})
        </button>
        <button onClick={() => setPestaña('Pendientes')} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${pestaña === 'Pendientes' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Solicitudes Pendientes 
          {solicitudesPendientes.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{solicitudesPendientes.length}</span>}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="Buscar por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium" />
        </div>
        
        {pestaña === 'Registrados' && (
          <>
            <div className="md:w-48 relative">
              <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium appearance-none bg-white cursor-pointer">
                <option value="Todos">Todos los estados</option>
                <option value="Activo">Solo Activos</option>
                <option value="Inactivo">Solo Inactivos</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>

            <div className="md:w-56 relative">
              <select value={grupoFiltro} onChange={(e) => setGrupoFiltro(e.target.value)} className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium appearance-none bg-white cursor-pointer">
                {gruposDisponibles.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4 md:px-6">Jugador</th>
                <th className="p-4 md:px-6">{pestaña === 'Registrados' ? 'Categoría' : 'Fecha Nac.'}</th>
                <th className="p-4 md:px-6">Contacto</th>
                <th className="p-4 md:px-6 text-center">Estado</th>
                <th className="p-4 md:px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {cargando ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="p-4 md:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                        <div>
                          <div className="h-4 bg-slate-200 rounded w-24 mb-1"></div>
                          <div className="h-3 bg-slate-200 rounded w-16"></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 md:px-6"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="p-4 md:px-6"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="p-4 md:px-6 flex justify-center"><div className="h-6 bg-slate-200 rounded-full w-16"></div></td>
                    <td className="p-4 md:px-6"><div className="h-8 bg-slate-200 rounded-lg w-20 ml-auto"></div></td>
                  </tr>
                ))
              ) : jugadoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <User className="w-12 h-12 mb-3 text-slate-300" />
                      <p className="font-medium text-slate-600">{pestaña === 'Registrados' ? 'No se encontraron jugadores con esos filtros' : 'No hay solicitudes pendientes'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                jugadoresFiltrados.map((jugador) => {
                  const estadoJugador = jugador.estado_miembro || 'Activo';

                  return (
                    <tr key={jugador.id} className={`hover:bg-slate-50 transition-colors group ${estadoJugador === 'Inactivo' ? 'opacity-60' : ''}`}>
                      <td className="p-4 md:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${estadoJugador === 'Inactivo' ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 border border-slate-200 text-slate-500'}`}>
                            {getInicial(jugador.nombres)}
                          </div>
                          <div>
                            <p className={`font-bold ${estadoJugador === 'Inactivo' ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'}`}>{jugador.nombres} {jugador.apellidos}</p>
                            <p className="text-xs text-slate-500 mt-0.5">ID: {jugador.documento_identidad || 'Sin registro'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 md:px-6 font-medium text-slate-600">{pestaña === 'Registrados' ? (jugador.grupos || <span className="text-slate-400 italic">Sin grupo</span>) : jugador.fecha_nacimiento}</td>
                      <td className="p-4 md:px-6"><p className="text-slate-700">{jugador.telefono || '---'}</p></td>
                      <td className="p-4 md:px-6 text-center">
                        {pestaña === 'Registrados' ? (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            estadoJugador === 'Inactivo' 
                              ? 'bg-slate-100 text-slate-500 border-slate-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {estadoJugador}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">En Revisión</span>
                        )}
                      </td>
                      <td className="p-4 md:px-6 text-right">
                        {pestaña === 'Registrados' ? (
                          <button onClick={() => router.push(`/director/miembros/${jugador.id}`)} className="bg-white border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors">Ver Perfil</button>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => aprobarJugador(jugador.id, `${jugador.nombres} ${jugador.apellidos}`)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 transition-colors"><Check className="w-3 h-3" /> Aprobar</button>
                            <button onClick={() => rechazarJugador(jugador.id, `${jugador.nombres} ${jugador.apellidos}`)} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 transition-colors"><X className="w-3 h-3" /> Rechazar</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}