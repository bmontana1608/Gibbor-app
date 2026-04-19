'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  UserCheck, BarChart2, TrendingUp, Plus, RefreshCw, 
  ClipboardList, CheckCircle, XCircle, Clock, Search, 
  BookOpen, ChevronRight, Users, Filter, Calendar, MapPin
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReporteAsistenciaDirector() {
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [sesionesAgrupadas, setSesionesAgrupadas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Filtros
  const [grupoFiltro, setGrupoFiltro] = useState('Todos los grupos');
  const [busqueda, setBusqueda] = useState('');
  const [sesionSeleccionada, setSesionSeleccionada] = useState<any | null>(null);

  async function cargarDatosBD() {
    setCargando(true);
    
    // Traer el historial real de asistencias
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
        perfiles (nombres, apellidos, foto_url)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Error al cargar asistencias: " + error.message);
    } else if (dataAsistencias) {
      setAsistencias(dataAsistencias);
      agruparPorSesion(dataAsistencias);
    }
    
    setCargando(false);
  }

  // Lógica para agrupar registros individuales en "Sesiones" (Grupo + Fecha)
  const agruparPorSesion = (registros: any[]) => {
    const grupos: Record<string, any> = {};

    registros.forEach(r => {
      const key = `${r.grupo}-${r.fecha}-${r.registrado_por}`;
      if (!grupos[key]) {
        grupos[key] = {
          id: key,
          grupo: r.grupo,
          fecha: r.fecha,
          registrado_por: r.registrado_por,
          total: 0,
          presentes: 0,
          ausentes: 0,
          excusas: 0,
          jugadores: []
        };
      }
      grupos[key].total++;
      if (r.estado === 'Presente') grupos[key].presentes++;
      else if (r.estado === 'Ausente') grupos[key].ausentes++;
      else grupos[key].excusas++;
      
      grupos[key].jugadores.push(r);
    });

    setSesionesAgrupadas(Object.values(grupos));
  };

  useEffect(() => {
    cargarDatosBD();
  }, []);

  // KPIs
  const totales = {
    presentes: asistencias.filter(a => a.estado === 'Presente').length,
    ausentes: asistencias.filter(a => a.estado === 'Ausente').length,
    total: asistencias.length,
    tasa: asistencias.length > 0 ? ((asistencias.filter(a => a.estado === 'Presente').length / asistencias.length) * 100).toFixed(1) : "0"
  };

  const gruposUnicos = ['Todos los grupos', ...Array.from(new Set(asistencias.map(a => a.grupo).filter(Boolean)))];

  const sesionesFiltradas = sesionesAgrupadas.filter(s => {
    const coincideGrupo = grupoFiltro === 'Todos los grupos' || s.grupo === grupoFiltro;
    const coincideBusqueda = s.grupo.toLowerCase().includes(busqueda.toLowerCase()) || s.registrado_por.toLowerCase().includes(busqueda.toLowerCase());
    return coincideGrupo && coincideBusqueda;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* HEADER TÁCTICO */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-3">
             <BarChart2 className="w-9 h-9 text-orange-500" /> Analítica de Asistencia
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Supervisión en tiempo real del quórum de la academia.</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={cargarDatosBD} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl text-slate-500 hover:text-orange-500 transition-all shadow-sm">
             <RefreshCw className={`w-5 h-5 ${cargando ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* DASHBOARD DE KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-orange-500/5 rounded-full" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tasa de Asistencia</p>
              <h3 className="text-3xl font-black text-orange-500">{totales.tasa}%</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-bold">PROMEDIO GLOBAL</p>
           </div>
           <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Presentes</p>
              <h3 className="text-3xl font-black text-emerald-500">{totales.presentes}</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-bold">JUGADORES EN CAMPO</p>
           </div>
           <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ausencias Hoy</p>
              <h3 className="text-3xl font-black text-rose-500">{totales.ausentes}</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-bold">ALERTAS DE FALTA</p>
           </div>
           <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sesiones Registradas</p>
              <h3 className="text-3xl font-black text-slate-800 dark:text-white">{sesionesAgrupadas.length}</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-bold">ENTRENAMIENTOS TOTALES</p>
           </div>
        </div>

        {/* BARRA DE FILTROS MODERNA */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center">
           <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar por grupo o entrenador..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
           </div>
           <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <select 
                  value={grupoFiltro}
                  onChange={(e) => setGrupoFiltro(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
                >
                  {gruposUnicos.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 rotate-90" />
              </div>
           </div>
        </div>

        {/* GRID DE SESIONES (TARJETAS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
           {cargando ? (
             Array.from({ length: 6 }).map((_, i) => (
               <div key={i} className="bg-white dark:bg-slate-900 h-64 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 animate-pulse" />
             ))
           ) : sesionesFiltradas.length === 0 ? (
             <div className="col-span-full p-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
               <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
               <p className="text-slate-400 font-bold italic">No se encontraron sesiones registradas.</p>
             </div>
           ) : (
             sesionesFiltradas.map(sesion => {
               const tasa = ((sesion.presentes / sesion.total) * 100).toFixed(0);
               return (
                 <div 
                   key={sesion.id}
                   className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-orange-500 transition-all flex flex-col group relative overflow-hidden"
                 >
                    {/* Badge de Tasa de Asistencia */}
                    <div className="absolute top-6 right-6">
                       <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-xs ${parseInt(tasa) > 80 ? 'border-emerald-500 text-emerald-500' : 'border-orange-500 text-orange-500'}`}>
                          {tasa}%
                       </div>
                    </div>

                    <div className="mb-6">
                       <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1 italic">{sesion.fecha}</p>
                       <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter leading-none">{sesion.grupo}</h4>
                    </div>

                    <div className="space-y-4 mb-8">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><Users className="w-4 h-4" /></div>
                          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Quórum: <span className="text-slate-900 dark:text-white">{sesion.total} jugadores convocados</span></p>
                       </div>
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><CheckCircle className="w-4 h-4 text-emerald-500" /></div>
                          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Asistieron: <span className="text-emerald-600 font-black">{sesion.presentes}</span></p>
                       </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                       <div className="overflow-hidden">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registrado por</p>
                          <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{sesion.registrado_por}</p>
                       </div>
                       <button 
                         onClick={() => setSesionSeleccionada(sesion)}
                         className="p-3 bg-slate-900 dark:bg-orange-600 text-white rounded-xl shadow-lg shadow-slate-900/10 hover:scale-110 active:scale-95 transition-all"
                       >
                         <ChevronRight className="w-5 h-5" />
                       </button>
                    </div>
                 </div>
               );
             })
           )}
        </div>
      </div>

      {/* MODAL DE DETALLES DE SESIÓN (EL LISTADO) */}
      {sesionSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-950 rounded-[3rem] w-full max-w-2xl max-h-[85vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Detalle de Sesión</h3>
                    <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest mt-2">{sesionSeleccionada.grupo} • {sesionSeleccionada.fecha}</p>
                 </div>
                 <button 
                   onClick={() => setSesionSeleccionada(null)}
                   className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-orange-500 transition-all"
                 >
                   <XCircle className="w-6 h-6" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scrollbar">
                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 text-center">
                       <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Presentes</p>
                       <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{sesionSeleccionada.presentes}</p>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-500/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-500/20 text-center">
                       <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Ausentes</p>
                       <p className="text-2xl font-black text-rose-700 dark:text-rose-400">{sesionSeleccionada.ausentes}</p>
                    </div>
                 </div>

                 <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sesionSeleccionada.jugadores.map((reg: any) => (
                      <div key={reg.id} className="py-4 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 border border-slate-200 dark:border-slate-700 overflow-hidden">
                               {reg.perfiles?.foto_url ? <img src={reg.perfiles.foto_url} className="w-full h-full object-cover" /> : reg.perfiles?.nombres?.charAt(0)}
                            </div>
                            <div>
                               <p className="font-bold text-slate-800 dark:text-white text-sm">{reg.perfiles?.nombres} {reg.perfiles?.apellidos}</p>
                               <p className="text-[9px] text-slate-400 font-bold uppercase">{reg.perfiles?.id.split('-')[0]}</p>
                            </div>
                         </div>
                         <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            reg.estado === 'Presente' ? 'bg-emerald-500 text-white' : 
                            reg.estado === 'Ausente' ? 'bg-rose-500 text-white' : 
                            'bg-amber-500 text-white'
                         }`}>
                            {reg.estado}
                         </span>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                 <button 
                   onClick={() => setSesionSeleccionada(null)}
                   className="w-full bg-slate-900 border border-slate-200 dark:bg-slate-800 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl"
                 >
                   Cerrar Detalle
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}