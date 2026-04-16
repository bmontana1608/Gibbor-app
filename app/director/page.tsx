'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Wallet, Users, ClipboardList, Calendar, TrendingUp, BarChart2, Zap, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardDirector() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [stats, setStats] = useState({
    totalMiembros: 0,
    alDia: 0,
    porcentajeAlDia: 0,
    totalGrupos: 0,
    conDeuda: 0,
    ingresosProyectados: 0,
    deudaEstimada: 0,
    tasaAsistencia: 0
  });
  const [gruposRendimiento, setGruposRendimiento] = useState<any[]>([]);
  const [actividadReciente, setActividadReciente] = useState<any[]>([]);

  useEffect(() => {
    async function cargarDatosDashboard() {
      setCargando(true);
      
      // 1. Cargar Jugadores
      const { data: jugadores, error: errJug } = await supabase
        .from('perfiles')
        .select('*')
        .eq('rol', 'Futbolista')
        .neq('estado_miembro', 'Pendiente');

      if (errJug) toast.error("Error cargando dashboard: " + errJug.message);

      // 2. Cargar Planes para cálculos financieros exactos
      const { data: planesData } = await supabase.from('planes').select('*');
      
      // 3. Cargar Pagos del mes (Option A logic)
      const hoy = new Date();
      const mesActual = hoy.getMonth() + 1;
      const anioActual = hoy.getFullYear();
      
      const { data: pagosMes } = await supabase
        .from('pagos_ingresos')
        .select('jugador_id')
        .gte('fecha', `${anioActual}-${String(mesActual).padStart(2, '0')}-01`);

      // 4. Cargar Asistencias para la tasa real
      const { data: asistData } = await supabase.from('asistencias').select('estado');

      if (jugadores) {
        const total = jugadores.length;
        const idsPagados = new Set(pagosMes?.map(p => p.jugador_id) || []);
        
        // Calcular tarifas por jugador
        let totalProyectado = 0;
        let deudaTotal = 0;
        let alDiaCount = 0;

        jugadores.forEach(j => {
            const plan = planesData?.find(p => p.nombre === (j.tipo_plan || 'Regular'));
            const precio = plan ? Number(plan.precio_base) : 0;
            if (precio > 0) {
                totalProyectado += precio;
                if (idsPagados.has(j.id)) {
                    alDiaCount++;
                } else {
                    deudaTotal += precio;
                }
            }
        });
        
        const porcentaje = total > 0 ? Math.round((alDiaCount / total) * 100) : 0;
        const conDeudaCount = total - alDiaCount;

        // Distribución por grupos
        const gruposMap = new Map();
        jugadores.forEach(p => {
          const nombreGrupo = p.grupos || 'Sin Asignar';
          if (!gruposMap.has(nombreGrupo)) gruposMap.set(nombreGrupo, 0);
          gruposMap.set(nombreGrupo, gruposMap.get(nombreGrupo) + 1);
        });

        const totalGrupos = gruposMap.has('Sin Asignar') ? gruposMap.size - 1 : gruposMap.size;
        
        const gruposArray = Array.from(gruposMap, ([nombre, cantidad]) => ({
          nombre,
          cantidad
        })).sort((a, b) => b.cantidad - a.cantidad);

        // Tasa de asistencia
        let tasa = 0;
        if (asistData && asistData.length > 0) {
            const presentes = asistData.filter(a => a.estado === 'Presente').length;
            tasa = Math.round((presentes / asistData.length) * 100);
        }

        setStats({
          totalMiembros: total,
          alDia: alDiaCount,
          porcentajeAlDia: porcentaje,
          totalGrupos: totalGrupos >= 0 ? totalGrupos : 0,
          conDeuda: conDeudaCount,
          ingresosProyectados: totalProyectado,
          deudaEstimada: deudaTotal,
          tasaAsistencia: tasa
        });
        setGruposRendimiento(gruposArray);
        setActividadReciente(jugadores.slice(0, 5));
      }
      
      setCargando(false);
    }

    cargarDatosDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 md:p-8 mb-6 shadow-sm flex justify-between items-center relative overflow-hidden border border-slate-700">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
        <div className="relative z-10">
          <h1 className="text-xl md:text-2xl font-bold text-white mb-1">¡Bienvenido a EFD Gibbor!</h1>
          <p className="text-sm text-slate-400">Gestiona tu establecimiento de forma integral.</p>
        </div>
        <div className="hidden md:block w-32 h-32 bg-orange-500/10 rounded-full absolute -right-10 -top-10 blur-2xl"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-orange-300 transition-colors cursor-pointer" onClick={() => router.push('/director/cobranza')}>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Miembros al día en sus pagos</p>
            {cargando ? (
              <div className="h-8 bg-slate-200 rounded w-1/2 animate-pulse mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-slate-800">{stats.alDia} <span className="text-sm font-normal text-slate-400">/ {stats.totalMiembros}</span></p>
            )}
            <p className="text-xs text-slate-400 mt-1">{cargando ? '-' : stats.porcentajeAlDia}% de miembros al día</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-orange-300 transition-colors cursor-pointer" onClick={() => router.push('/director/categorias')}>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Grupos Activos</p>
            {cargando ? (
              <div className="h-8 bg-slate-200 rounded w-1/3 animate-pulse mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-slate-800">{stats.totalGrupos}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">Categorías en entrenamiento</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-orange-300 transition-colors cursor-pointer" onClick={() => router.push('/director/asistencia')}>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Tasa de Asistencia</p>
            <p className="text-2xl font-bold text-slate-800">{cargando ? '--' : stats.tasaAsistencia} %</p>
            <p className="text-xs text-slate-400 mt-1">Promedio global de asistencia</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-orange-300 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Eventos Próximos</p>
            <p className="text-2xl font-bold text-slate-800">0</p>
            <p className="text-xs text-slate-400 mt-1">No hay torneos programados</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-sm">Análisis Financiero</h3>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          
          {cargando ? (
            <div className="space-y-4">
              <div className="h-8 bg-slate-200 rounded w-2/3 animate-pulse"></div>
              <div className="h-4 bg-slate-200 rounded w-full animate-pulse mt-4"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6 animate-pulse"></div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex justify-between items-end mb-1"><p className="text-xs text-slate-500">Ingresos proyectados</p></div>
                <p className="text-3xl font-bold text-emerald-600">$ {stats.ingresosProyectados.toLocaleString('es-CO')}</p>
              </div>
              <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Deuda Estimada:</span><span className="font-medium text-red-500">$ {stats.deudaEstimada.toLocaleString('es-CO')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Miembros en mora:</span><span className="font-medium text-slate-800">{stats.conDeuda} jugadores</span></div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-sm">Rendimiento Académico</h3>
            <BarChart2 className="w-5 h-5 text-blue-500" />
          </div>
          
          {cargando ? (
            <div className="space-y-4">
               <div className="h-5 bg-slate-200 rounded animate-pulse w-full"></div>
               <div className="h-5 bg-slate-200 rounded animate-pulse w-full"></div>
               <div className="h-5 bg-slate-200 rounded animate-pulse w-full"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm"><span className="text-slate-500">Tasa de asistencia global</span><span className="font-bold text-blue-600 text-lg">{stats.tasaAsistencia}%</span></div>
              <div className="flex justify-between items-center text-sm border-t border-slate-50 pt-4"><span className="text-slate-500">Grupo más grande</span><span className="font-semibold text-slate-800 text-right text-xs">{gruposRendimiento.length > 0 && gruposRendimiento[0].nombre !== 'Sin Asignar' ? gruposRendimiento[0].nombre : (gruposRendimiento.length > 1 ? gruposRendimiento[1].nombre : 'N/A')}</span></div>
              <div className="flex justify-between items-center text-sm border-t border-slate-50 pt-4"><span className="text-slate-500">Promedio por grupo</span><span className="font-medium text-slate-800">{stats.totalGrupos > 0 ? Math.round(stats.totalMiembros / stats.totalGrupos) : 0} miembros</span></div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-sm">Resumen Rápido</h3>
            <Zap className="w-5 h-5 text-purple-500" />
          </div>
          
          {cargando ? (
            <div className="space-y-4">
               <div className="h-5 bg-slate-200 rounded animate-pulse w-full"></div>
               <div className="h-5 bg-slate-200 rounded animate-pulse w-full"></div>
               <div className="h-5 bg-slate-200 rounded animate-pulse w-full"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm"><span className="text-slate-600 flex items-center gap-2"><Users className="w-4 h-4" /> Total Jugadores</span><span className="font-medium text-slate-800">{stats.totalMiembros}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-600 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Categorías</span><span className="font-medium text-slate-800">{stats.totalGrupos}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> Con deuda</span><span className="font-medium text-slate-800">{stats.conDeuda}</span></div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-96">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-slate-800 text-sm">Distribución de Grupos</h3>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto custom-scrollbar">
            {cargando ? (
              <div className="p-5 space-y-4 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-full"></div>
                <div className="h-6 bg-slate-200 rounded w-full"></div>
                <div className="h-6 bg-slate-200 rounded w-full"></div>
              </div>
            ) : gruposRendimiento.length === 0 ? (
              <p className="p-5 text-sm text-slate-500 text-center">No hay grupos registrados aún.</p>
            ) : (
              gruposRendimiento.map((grupo, index) => (
                <div key={index} className="p-5 hover:bg-slate-50 transition-colors flex justify-between items-center">
                  <div>
                    <p className={`text-sm font-bold ${grupo.nombre === 'Sin Asignar' ? 'text-red-500' : 'text-slate-800'}`}>{grupo.nombre}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Gibbor Club</p>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{grupo.cantidad} <span className="text-slate-400 text-xs font-normal">/ {stats.totalMiembros}</span></p>
                      <p className="text-[10px] text-slate-400 uppercase">Jugadores</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-96">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-slate-800 text-sm">Últimos Registros en BD</h3>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
            <div className="relative border-l border-slate-200 ml-3 space-y-6 pb-4">
              {cargando ? (
                 <div className="pl-6 space-y-6 animate-pulse">
                   <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                   <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                   <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                 </div>
              ) : actividadReciente.length === 0 ? (
                <p className="pl-6 text-sm text-slate-500">No hay registros recientes.</p>
              ) : (
                actividadReciente.map((perfil, index) => {
                  const estadoLimpio = (perfil.estado_pago || '').trim().toLowerCase();
                  const colorPunto = (estadoLimpio === 'al día' || estadoLimpio === 'al dia') ? 'bg-emerald-500' : 'bg-red-500';
                  
                  return (
                    <div key={perfil.id} className="relative pl-6">
                      <div className={`absolute w-2.5 h-2.5 ${colorPunto} rounded-full left-[-5.5px] top-1.5 ring-4 ring-white shadow-sm`}></div>
                      <p className="text-sm text-slate-700">
                        <span className="font-bold">{perfil.nombres} {perfil.apellidos}</span> se unió al club
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{perfil.grupos || 'Sin grupo'} • {perfil.estado_pago || 'Pago pendiente'}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}