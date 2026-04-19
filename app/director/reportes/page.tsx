'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  PieChart, ClipboardCheck, DollarSign, Users, 
  Download, Search, RefreshCw, TrendingUp, 
  BarChart, AlertCircle, Calendar, Target,
  ArrowUpRight, ArrowDownRight, CreditCard, UserPlus, UserMinus
} from 'lucide-react';
import { toast } from 'sonner';

export default function ModuloReportes() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  
  // Pestaña activa
  const [pestañaActiva, setPestañaActiva] = useState<'Resumen' | 'Asistencia' | 'Financiero' | 'Miembros'>('Resumen');
  
  // Filtros superiores
  const [filtroTiempo, setFiltroTiempo] = useState('Últimos 30 días');
  const [filtroGrupo, setFiltroGrupo] = useState('Todos los grupos');
  const [busquedaMiembro, setBusquedaMiembro] = useState('');

  const cargarDatos = async () => {
    setCargando(true);
    
    // 1. Jugadores
    const { data: jugData } = await supabase.from('perfiles')
      .select('*')
      .eq('rol', 'Futbolista')
      .neq('estado_miembro', 'Pendiente')
      .order('nombres', { ascending: true });
    if (jugData) setJugadores(jugData);

    // 2. Categorías
    const { data: catData } = await supabase.from('categorias').select('*');
    if (catData) setCategorias(catData);

    // 3. Planes
    const { data: planesData } = await supabase.from('planes').select('*');
    if (planesData) setPlanes(planesData);

    // 4. Asistencias
    const { data: asisData } = await supabase.from('asistencias').select('*');
    if (asisData) setAsistencias(asisData);

    // 5. Pagos Reales (mes actual)
    const primerDiaMes = new Date();
    primerDiaMes.setDate(1);
    const { data: pagosData } = await supabase.from('pagos_ingresos')
      .select('*')
      .gte('fecha', primerDiaMes.toISOString());
    if (pagosData) setPagos(pagosData);

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const actualizarDatos = async () => {
    const toastId = toast.loading("Actualizando métricas...");
    await cargarDatos();
    toast.success("Métricas actualizadas", { id: toastId });
  };

  const calcularTarifa = (planId: string) => {
    const plan = planes.find(p => p.nombre === planId);
    return plan ? Number(plan.precio_base) : 0;
  };

  // --- CÁLCULOS DINÁMICOS ---
  
  // 1. Ingresos Esperados (según planes asignados)
  const ingresosEsperados = jugadores.reduce((acc, jug) => {
    const plan = planes.find(p => p.nombre === jug.tipo_plan);
    return acc + (plan?.precio_base || 0);
  }, 0);

  // 2. Ingresos Recaudados (Real de la tabla pagos_ingresos)
  const ingresosRecaudados = pagos.reduce((acc, p) => acc + parseFloat(p.total || 0), 0);

  // 3. Deuda y Gestión
  const deudaPendiente = Math.max(0, ingresosEsperados - ingresosRecaudados);
  const tasaCobro = ingresosEsperados > 0 ? Math.round((ingresosRecaudados / ingresosEsperados) * 100) : 0;

  // 4. Asistencia Real (Global)
  const totalAsistenciasPosibles = asistencias.length;
  const presentes = asistencias.filter(a => a.estado === 'Presente').length;
  const tasaAsistenciaGlobal = totalAsistenciasPosibles > 0 ? Math.round((presentes / totalAsistenciasPosibles) * 100) : 0;

  // 5. Asistencia por Categoría
  const obtenerAsistenciaGrupo = (nombreGrupo: string) => {
    const asisGrupo = asistencias.filter(a => a.grupo === nombreGrupo);
    if (asisGrupo.length === 0) return 0;
    const presentesGrupo = asisGrupo.filter(a => a.estado === 'Presente').length;
    return Math.round((presentesGrupo / asisGrupo.length) * 100);
  };

  // --- FILTRAR MIEMBROS PARA LA TABLA ---
  const miembrosFiltrados = jugadores.filter(j => {
    const coincideBusqueda = `${j.nombres} ${j.apellidos}`.toLowerCase().includes(busquedaMiembro.toLowerCase());
    const coincideGrupo = filtroGrupo === 'Todos los grupos' || j.grupos === filtroGrupo;
    return coincideBusqueda && coincideGrupo;
  });

  // --- FUNCIÓN EXPORTAR ---
  const exportarCSV = () => {
    if (miembrosFiltrados.length === 0) return toast.error("No hay datos para exportar");
    
    const cabeceras = ['Miembro', 'Grupo', 'Asistencia', 'Fecha Inscripcion', 'Estado Pago', 'Total Pagado'];
    const filas = miembrosFiltrados.map(j => {
      const plan = planes.find(p => p.nombre === j.tipo_plan);
      const tarifa = plan?.precio_base || 0;
      const pagado = (pagos.find(p => p.jugador_id === j.id) || tarifa === 0) ? tarifa : 0;
      const asisIndividual = obtenerAsistenciaGrupo(j.grupos);
      const labelEstado = tarifa === 0 ? 'Becado' : (j.estado_pago || 'Pendiente');
      
      return [
        `"${j.nombres} ${j.apellidos}"`, `"${j.grupos || 'Sin grupo'}"`, `"${asisIndividual}%"`, 
        `"${new Date(j.created_at).toLocaleDateString('es-ES')}"`, `"${labelEstado}"`, `"${pagado}"`
      ];
    });
    // Se usa el separador ; para compatibilidad directa con el Excel de LATAM/España
    const contenidoCSV = [cabeceras.join(';'), ...filas.map(f => f.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); 
    link.href = url; 
    link.setAttribute('download', `Reporte_Gibbor_${pestañaActiva}.csv`);
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
    toast.success("Reporte descargado correctamente");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      
      {/* CABECERA */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart className="w-6 h-6 text-orange-500" /> Reportes y Análisis
        </h1>
        
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 w-full md:w-auto">
            <select value={filtroTiempo} onChange={(e) => setFiltroTiempo(e.target.value)} className="bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium outline-none cursor-pointer focus:ring-2 focus:ring-orange-500">
              <option>Últimos 7 días</option>
              <option>Últimos 30 días</option>
              <option>Este año</option>
            </select>
            <select value={filtroGrupo} onChange={(e) => setFiltroGrupo(e.target.value)} className="bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium outline-none cursor-pointer focus:ring-2 focus:ring-orange-500">
              <option>Todos los grupos</option>
              {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
          </div>
          
          <button onClick={actualizarDatos} className="w-full md:w-auto bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> Actualizar Datos
          </button>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="bg-white rounded-t-2xl border-b border-slate-200 flex overflow-x-auto custom-scrollbar">
        <button onClick={() => setPestañaActiva('Resumen')} className={`px-6 py-4 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${pestañaActiva === 'Resumen' ? 'border-orange-500 text-orange-600 bg-orange-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
          <PieChart className="w-4 h-4" /> Resumen
        </button>
        <button onClick={() => setPestañaActiva('Asistencia')} className={`px-6 py-4 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${pestañaActiva === 'Asistencia' ? 'border-orange-500 text-orange-600 bg-orange-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
          <ClipboardCheck className="w-4 h-4" /> Asistencia
        </button>
        <button onClick={() => setPestañaActiva('Financiero')} className={`px-6 py-4 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${pestañaActiva === 'Financiero' ? 'border-orange-500 text-orange-600 bg-orange-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
          <DollarSign className="w-4 h-4" /> Financiero
        </button>
        <button onClick={() => setPestañaActiva('Miembros')} className={`px-6 py-4 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${pestañaActiva === 'Miembros' ? 'border-orange-500 text-orange-600 bg-orange-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
          <Users className="w-4 h-4" /> Miembros
        </button>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200 shadow-sm p-6 min-h-[500px]">
        
        {/* BOTÓN EXPORTAR */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            {pestañaActiva === 'Resumen' && <><PieChart className="w-5 h-5 text-slate-400" /> Resumen General</>}
            {pestañaActiva === 'Asistencia' && <><ClipboardCheck className="w-5 h-5 text-emerald-500" /> Reporte de Asistencia</>}
            {pestañaActiva === 'Financiero' && <><DollarSign className="w-5 h-5 text-emerald-500" /> Reporte Financiero</>}
            {pestañaActiva === 'Miembros' && <><Users className="w-5 h-5 text-blue-500" /> Reporte de Miembros</>}
          </h2>
          <button onClick={exportarCSV} className="bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2 shadow-sm">
            <Download className="w-4 h-4" /> Exportar a Excel
          </button>
        </div>

        {cargando ? (
          /* SKELETON LOADER PARA PESTAÑAS DENTRO DEL CONTENEDOR */
          <div className="animate-pulse flex flex-col gap-8">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-32 bg-slate-200 rounded-xl"></div>
              <div className="h-32 bg-slate-200 rounded-xl"></div>
              <div className="h-32 bg-slate-200 rounded-xl"></div>
            </div>
            <div className="h-64 bg-slate-200 rounded-xl w-full"></div>
          </div>
        ) : (
          <>
            {/* --- PESTAÑA: RESUMEN --- */}
            {pestañaActiva === 'Resumen' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Tendencia de Ingresos */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Tendencia de Ingresos</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Cobranza del Mes</span><span className="font-bold text-slate-800">${ingresosRecaudados.toLocaleString('es-CO')}</span></div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50"><div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min(tasaCobro, 100)}%` }}></div></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Proyección (Esperados)</span><span className="font-bold text-slate-800">${ingresosEsperados.toLocaleString('es-CO')}</span></div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50"><div className="bg-blue-300 h-2 rounded-full transition-all" style={{ width: '100%' }}></div></div>
                    </div>
                  </div>
                </div>

                {/* Promedio de Asistencia */}
                <div className="space-y-4 border-l border-slate-100 pl-8">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500" /> Promedio de Asistencia por Día</h3>
                  <ul className="space-y-2.5 text-sm text-slate-600">
                    <li className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-300"></span>Domingo</span><span className="font-bold text-slate-800 bg-slate-100 px-2 rounded">0</span></li>
                    <li className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400"></span>Lunes</span><span className="font-bold text-slate-800 bg-slate-100 px-2 rounded">0</span></li>
                    <li className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Martes</span><span className="font-bold text-slate-800 bg-slate-100 px-2 rounded">0</span></li>
                    <li className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Miércoles</span><span className="font-bold text-slate-800 bg-slate-100 px-2 rounded">0</span></li>
                    <li className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-400"></span>Jueves</span><span className="font-bold text-slate-800 bg-slate-100 px-2 rounded">0</span></li>
                    <li className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-400"></span>Viernes</span><span className="font-bold text-slate-800 bg-slate-100 px-2 rounded">0</span></li>
                    <li className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-400"></span>Sábado</span><span className="font-bold text-slate-800 bg-slate-100 px-2 rounded">0</span></li>
                  </ul>
                </div>

                {/* Grupos con Mejor Asistencia */}
                <div className="space-y-4 border-l border-slate-100 pl-8">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Target className="w-4 h-4 text-orange-500" /> Grupos con Mejor Asistencia</h3>
                  <div className="space-y-3">
                    {categorias.length === 0 ? <p className="text-sm text-slate-400 italic">No hay grupos.</p> : categorias.map(cat => (
                      <div key={cat.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{cat.nombre}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{cat.deporte}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-800">{obtenerAsistenciaGrupo(cat.nombre)}%</p>
                          <p className="text-[10px] text-slate-400 font-bold">promedio</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- PESTAÑA: ASISTENCIA --- */}
            {pestañaActiva === 'Asistencia' && (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="py-4 px-4 rounded-tl-lg">Grupo</th>
                      <th className="py-4 px-4">Deporte</th>
                      <th className="py-4 px-4 text-center">Sesiones</th>
                      <th className="py-4 px-4 text-center">Asistencia Prom.</th>
                      <th className="py-4 px-4 text-center">Tasa Global</th>
                      <th className="py-4 px-4 text-center rounded-tr-lg">Tendencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {categorias.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-slate-500 font-medium">No hay grupos creados en la plataforma.</td></tr> : categorias.map(cat => (
                      <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{cat.nombre}</td>
                        <td className="py-3 px-4 text-slate-600 flex items-center gap-1.5"><Target className="w-3 h-3 text-slate-400" /> {cat.deporte}</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700">{asistencias.filter(a => a.grupo === cat.nombre).length}</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700">{asistencias.filter(a => a.grupo === cat.nombre && a.estado === 'Presente').length} / {cat.capacidad_maxima || 0}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${obtenerAsistenciaGrupo(cat.nombre) >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{obtenerAsistenciaGrupo(cat.nombre)}%</span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400 font-bold">{obtenerAsistenciaGrupo(cat.nombre) >= 50 ? 'Stable' : 'Unstable'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-8 bg-blue-50/50 border border-blue-100/50 p-5 rounded-2xl flex gap-4 items-start">
                  <AlertCircle className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-800 text-sm font-bold mb-1">Métricas de asistencia no disponibles</p>
                    <p className="text-blue-600 text-xs">Las métricas se encuentran en 0% porque aún no se han registrado asistencias mediante el panel de entrenadores. Una vez comiencen las clases, estos datos se poblarán en tiempo real.</p>
                  </div>
                </div>
              </div>
            )}

            {/* --- PESTAÑA: FINANCIERO --- */}
            {pestañaActiva === 'Financiero' && (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="py-4 px-4 rounded-tl-lg">Periodo</th>
                      <th className="py-4 px-4">Ingresos Recaudados</th>
                      <th className="py-4 px-4">Cartera Pendiente</th>
                      <th className="py-4 px-4 text-center">Tasa Cobro Efectiva</th>
                      <th className="py-4 px-4 text-center">Altas</th>
                      <th className="py-4 px-4 text-center rounded-tr-lg">Bajas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="py-5 px-4 font-bold text-slate-800 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500" /> Mes Actual</td>
                      <td className="py-5 px-4 font-bold text-emerald-600 flex items-center gap-1"><ArrowUpRight className="w-4 h-4" /> ${ingresosRecaudados.toLocaleString('es-CO')}</td>
                      <td className="py-5 px-4 font-bold text-red-500 flex items-center gap-1"><CreditCard className="w-4 h-4" /> ${deudaPendiente.toLocaleString('es-CO')}</td>
                      <td className="py-5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${tasaCobro >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {tasaCobro}%
                        </span>
                      </td>
                      <td className="py-5 px-4 text-center text-emerald-600 font-bold flex items-center justify-center gap-1"><UserPlus className="w-4 h-4" /> +{jugadores.length}</td>
                      <td className="py-5 px-4 text-center text-rose-500 font-bold flex items-center justify-center gap-1"><UserMinus className="w-4 h-4" /> -0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* --- PESTAÑA: MIEMBROS --- */}
            {pestañaActiva === 'Miembros' && (
              <div>
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Buscar métricas de un miembro por nombre o apellido..." 
                    value={busquedaMiembro}
                    onChange={(e) => setBusquedaMiembro(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl outline-none text-sm focus:ring-2 focus:ring-orange-500 shadow-sm" 
                  />
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                        <th className="py-4 px-4 rounded-tl-lg">Atleta / Miembro</th>
                        <th className="py-4 px-4">Grupo Base</th>
                        <th className="py-4 px-4 text-center">Asistencia %</th>
                        <th className="py-4 px-4">Fecha Inscripción</th>
                        <th className="py-4 px-4 text-center">Estado Financiero</th>
                        <th className="py-4 px-4 text-right rounded-tr-lg">Total Pagado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {miembrosFiltrados.length === 0 ? (
                        <tr><td colSpan={6} className="py-12 text-center text-slate-500 font-medium">Ningún miembro coincide con tu búsqueda o filtros.</td></tr>
                      ) : (
                        miembrosFiltrados.map(j => {
                          const tarifa = calcularTarifa(j.tipo_plan);
                          const estado = (j.estado_pago || '').trim().toLowerCase();
                          // Becados o marcados manualmente
                          const esAlDia = estado === 'al día' || estado === 'al dia' || tarifa === 0;
                          const fechaCorta = new Date(j.created_at).toLocaleDateString('es-ES');

                          return (
                            <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4">
                                <p className="font-bold text-slate-800 tracking-tight">{j.nombres} {j.apellidos}</p>
                                <p className="text-[10px] text-slate-400 tracking-wider uppercase font-bold">{j.email_contacto || 'Sin email registrado'}</p>
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-medium flex items-center gap-1.5"><Target className="w-3 h-3 text-slate-400 shrink-0" /> {j.grupos || 'Agente libre'}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-100">{obtenerAsistenciaGrupo(j.grupos)}%</span>
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-medium flex items-center gap-1.5"><Calendar className="w-3 h-3 text-slate-400" /> {fechaCorta}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border ${esAlDia ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                  {tarifa === 0 ? 'Becado' : (esAlDia ? 'Al día' : 'En Mora')}
                                </span>
                              </td>
                              <td className={`py-3 px-4 text-right font-bold ${esAlDia ? 'text-emerald-600' : 'text-slate-400'}`}>
                                ${esAlDia ? tarifa.toLocaleString('es-CO') : '0'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
}