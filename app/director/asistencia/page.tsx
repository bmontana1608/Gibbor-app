'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserCheck, BarChart2, TrendingUp, Plus, RefreshCw, ClipboardList, CheckCircle, XCircle, Clock, Search, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function ReporteAsistenciaDirector() {
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false); // Para el botón de prueba

  // Filtros
  const [grupoFiltro, setGrupoFiltro] = useState('Todos los grupos');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos los estados');
  const [busqueda, setBusqueda] = useState('');

  // Función principal para traer la realidad
  async function cargarDatosBD() {
    setCargando(true);
    
    // 1. Traer jugadores para los filtros y para el registro manual (Solo Alumnos)
    const { data: dataJugadores, error: errJugadores } = await supabase
      .from('perfiles')
      .select('id, nombres, apellidos, grupos')
      .eq('rol', 'Futbolista')
      .neq('estado_miembro', 'Pendiente');
      
    if (dataJugadores) setJugadores(dataJugadores);
    if (errJugadores) toast.error("Error cargando jugadores: " + errJugadores.message);

    // 2. Traer el historial real de asistencias cruzando datos con los nombres de los perfiles
    const { data: dataAsistencias, error } = await supabase
      .from('asistencias')
      .select(`
        id,
        grupo,
        fecha,
        estado,
        registrado_por,
        created_at,
        jugador_id,
        perfiles (nombres, apellidos)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Error al cargar asistencias: " + error.message);
    } else if (dataAsistencias) {
      setAsistencias(dataAsistencias);
    }
    
    setCargando(false);
  }

  useEffect(() => {
    cargarDatosBD();
  }, []);

  // --- MATEMÁTICAS REALES BASADAS EN LA BASE DE DATOS ---
  const totalRegistros = asistencias.length;
  const presentes = asistencias.filter(a => a.estado === 'Presente').length;
  const ausentes = asistencias.filter(a => a.estado === 'Ausente').length;
  const excusas = asistencias.filter(a => a.estado === 'Excusa' || a.estado === 'Tardío').length;
  const tasaAsistencia = totalRegistros > 0 ? ((presentes / totalRegistros) * 100).toFixed(1) : "0.0";

  const grupos = ['Todos los grupos', ...Array.from(new Set(jugadores.map(j => j.grupos).filter(Boolean)))];

  const asistenciasFiltradas = asistencias.filter(a => {
    const coincideGrupo = grupoFiltro === 'Todos los grupos' || a.grupo === grupoFiltro;
    const coincideEstado = estadoFiltro === 'Todos los estados' || a.estado === estadoFiltro;
    const nombreCompleto = a.perfiles ? `${a.perfiles.nombres} ${a.perfiles.apellidos}` : 'Desconocido';
    const coincideBusqueda = nombreCompleto.toLowerCase().includes(busqueda.toLowerCase());
    return coincideGrupo && coincideEstado && coincideBusqueda;
  });

  // --- FUNCIÓN DE PRUEBA: REGISTRAR ASISTENCIA MANUAL ---
  const registrarPruebaAleatoria = async () => {
    if (jugadores.length === 0) return toast.error("No hay jugadores válidos registrados para la prueba.");
    setProcesando(true);
    const toastId = toast.loading("Registrando asistencia de prueba...");

    // Seleccionamos un jugador al azar de tu BD real
    const jugadorAzar = jugadores[Math.floor(Math.random() * jugadores.length)];
    const estados = ['Presente', 'Presente', 'Presente', 'Ausente', 'Excusa']; // Más probabilidad de presente
    const estadoAzar = estados[Math.floor(Math.random() * estados.length)];

    const { error } = await supabase
      .from('asistencias')
      .insert([
        {
          jugador_id: jugadorAzar.id,
          grupo: jugadorAzar.grupos || 'Sin asignar',
          estado: estadoAzar,
          registrado_por: 'Director',
          fecha: new Date().toISOString().split('T')[0] // Fecha de hoy en formato YYYY-MM-DD
        }
      ]);

    if (error) {
      toast.error("Error al registrar: " + error.message, { id: toastId });
    } else {
      toast.success(`${estadoAzar} registrado para ${jugadorAzar.nombres}`, { id: toastId });
      await cargarDatosBD();
    }
    setProcesando(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      
      {/* 1. CABECERA */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="text-orange-500 w-7 h-7" /> Asistencia
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona y monitorea el historial de asistencia de los miembros</p>
        </div>
      </div>

      {/* 2. BARRA DE BOTONES DE ACCIÓN */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center gap-2">
          <BarChart2 className="w-4 h-4" /> Monitoreo Entrenadores
        </button>
        <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" /> Estadísticas
        </button>
        
        {/* BOTÓN CONECTADO A SUPABASE PARA PRUEBAS */}
        <button 
          onClick={registrarPruebaAleatoria}
          disabled={procesando || cargando}
          className="bg-white hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 group"
        >
          {procesando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />} 
          {procesando ? 'Guardando...' : 'Registrar Prueba Manual'}
        </button>
        
        <button onClick={cargarDatosBD} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin text-orange-500' : 'text-slate-500'}`} /> Actualizar
        </button>
      </div>

      {/* 3. TARJETAS DE KPIs (CONECTADAS A BD) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-500 font-medium mb-1">Total Registros</p>
          <div className="flex justify-between items-end">
            <p className="text-2xl font-bold text-slate-800">{cargando ? <span className="animate-pulse bg-slate-200 h-8 w-12 block rounded"></span> : totalRegistros}</p>
            <ClipboardList className="text-slate-400 w-6 h-6" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-500 font-medium mb-1">Presentes</p>
          <div className="flex justify-between items-end">
            <p className="text-2xl font-bold text-emerald-600">{cargando ? <span className="animate-pulse bg-emerald-100 h-8 w-12 block rounded"></span> : presentes}</p>
            <CheckCircle className="text-emerald-500 w-6 h-6" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-500 font-medium mb-1">Ausentes</p>
          <div className="flex justify-between items-end">
            <p className="text-2xl font-bold text-red-600">{cargando ? <span className="animate-pulse bg-red-100 h-8 w-12 block rounded"></span> : ausentes}</p>
            <XCircle className="text-red-500 w-6 h-6" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-500 font-medium mb-1">Excusas / Tardíos</p>
          <div className="flex justify-between items-end">
            <p className="text-2xl font-bold text-blue-600">{cargando ? <span className="animate-pulse bg-blue-100 h-8 w-12 block rounded"></span> : excusas}</p>
            <Clock className="text-blue-500 w-6 h-6" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-500 font-medium mb-1">Tasa Asistencia</p>
          <div className="flex justify-between items-end">
            <p className="text-2xl font-bold text-orange-600">{cargando ? <span className="animate-pulse bg-orange-100 h-8 w-16 block rounded"></span> : `${tasaAsistencia}%`}</p>
            <TrendingUp className="text-orange-500 w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 4. PANEL DE FILTROS SUPER COMPLETO */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 md:p-6 mb-6">
        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-700 mb-2">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre de alumno..." 
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm text-slate-700"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Grupo</label>
            <select 
              value={grupoFiltro}
              onChange={(e) => setGrupoFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              {grupos.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Estado</label>
            <select 
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option>Todos los estados</option>
              <option>Presente</option>
              <option>Ausente</option>
              <option>Excusa</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. TABLA DE DATOS (CONECTADA A BD) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4">Miembro</th>
                <th className="p-4">Grupo</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Registrado por</th>
                <th className="p-4">Hora Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {cargando ? (
                 Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-3/4"></div></td>
                    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-1/2"></div></td>
                    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="p-4"><div className="h-6 bg-slate-200 rounded-full w-20"></div></td>
                    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-2/3"></div></td>
                    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                  </tr>
                ))
              ) : asistenciasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <BookOpen className="w-12 h-12 mb-3 text-slate-300" />
                      <p className="text-lg font-medium text-slate-600">No hay registros de asistencia en la base de datos.</p>
                      <p className="text-sm mt-1">Presiona "Registrar Prueba Manual" arriba para hacer una prueba real.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                asistenciasFiltradas.map((registro) => {
                  // Extraemos el nombre gracias a la relación en la base de datos
                  const nombreJugador = registro.perfiles 
                    ? `${registro.perfiles.nombres} ${registro.perfiles.apellidos}` 
                    : 'Jugador Desconocido';
                  
                  // Formateamos la hora de creación
                  const horaFormateada = new Date(registro.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr key={registro.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{nombreJugador}</td>
                      <td className="p-4">{registro.grupo}</td>
                      <td className="p-4">{registro.fecha}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          registro.estado === 'Presente' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          registro.estado === 'Ausente' ? 'bg-red-50 text-red-700 border-red-200' : 
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {registro.estado}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 font-medium">{registro.registrado_por}</td>
                      <td className="p-4 text-slate-500">{horaFormateada}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}