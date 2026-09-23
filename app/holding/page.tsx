'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/lib/hooks/useTenant';
import {
  Building2, Users, TrendingUp, DollarSign, ExternalLink,
  MapPin, BarChart2, ArrowUpRight, Loader, ChevronRight, AlertCircle
} from 'lucide-react';

function formatCurrency(val: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-slate-800 dark:text-white leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function HoldingDashboard() {
  const router = useRouter();
  const { slug: tenantSlug } = useTenant();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [holding, setHolding] = useState<any>(null);
  const [sedes, setSedes] = useState<any[]>([]);
  const [metricas, setMetricas] = useState<any>(null);
  const [sedeFiltro, setSedeFiltro] = useState<string>('todas');

  useEffect(() => {
    if (!tenantSlug) return;
    cargarDatos();
  }, [tenantSlug]);

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/holding?slug=${tenantSlug}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cargar el holding');
        return;
      }

      setHolding(data.holding);
      setSedes(data.sedes || []);
      setMetricas(data.metricas);
    } catch (e: any) {
      setError('Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  const sedesFiltradas = sedeFiltro === 'todas'
    ? sedes
    : sedes.filter(s => s.id === sedeFiltro);

  const metricasFiltradas = sedeFiltro === 'todas'
    ? metricas
    : (() => {
        const sede = sedes.find(s => s.id === sedeFiltro);
        return sede?.stats || { totalAlumnos: 0, alumnosActivos: 0, ingresosMes: 0, totalSedes: 1 };
      })();

  const irASede = (sedeSlug: string) => {
    router.push(`/${sedeSlug}/director`);
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-3">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-slate-600 font-semibold">{error}</p>
        <button onClick={cargarDatos} className="text-sm text-emerald-600 hover:underline font-bold">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-emerald-500" />
            Reporte Global
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Vista consolidada de todas las sedes del Holding</p>
        </div>

        {/* Filtro por sede */}
        {sedes.length > 1 && (
          <select
            value={sedeFiltro}
            onChange={e => setSedeFiltro(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-white shadow-sm"
          >
            <option value="todas">Todas las Sedes</option>
            {sedes.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {/* Métricas consolidadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="Total de Sedes"
          value={sedeFiltro === 'todas' ? (metricas?.totalSedes ?? 0) : 1}
          sub="Sedes activas"
          color="bg-indigo-500"
        />
        <StatCard
          icon={Users}
          label="Total Alumnos"
          value={metricasFiltradas?.totalAlumnos ?? 0}
          sub={`${metricasFiltradas?.alumnosActivos ?? 0} activos`}
          color="bg-emerald-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Alumnos Activos"
          value={metricasFiltradas?.alumnosActivos ?? 0}
          sub={metricasFiltradas?.totalAlumnos
            ? `${Math.round((metricasFiltradas.alumnosActivos / metricasFiltradas.totalAlumnos) * 100)}% del total`
            : ''}
          color="bg-sky-500"
        />
        <StatCard
          icon={DollarSign}
          label="Ingresos del Mes"
          value={formatCurrency(metricasFiltradas?.ingresosMes ?? 0)}
          sub="Suma de todas las sedes"
          color="bg-amber-500"
        />
      </div>

      {/* Tabla de Sedes */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-500" />
            Mis Sedes
          </h2>
        </div>

        {sedesFiltradas.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold">Sin sedes registradas aún</p>
            <p className="text-sm mt-1">Contacta al Super Admin para vincular sedes a tu Holding.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sedesFiltradas.map(sede => (
              <div
                key={sede.id}
                className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                {/* Info de la sede */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-lg"
                    style={{ backgroundColor: sede.color_primario || '#10b981' }}
                  >
                    {sede.logo_url
                      ? <img src={sede.logo_url} alt={sede.nombre} className="w-full h-full object-cover rounded-xl" />
                      : sede.nombre.charAt(0)
                    }
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white text-sm">{sede.nombre}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {sede.ciudad || sede.pais || 'Sin ubicación'}
                    </p>
                  </div>
                </div>

                {/* Stats de la sede */}
                <div className="flex items-center gap-6 md:gap-8 flex-wrap">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 font-semibold">Alumnos</p>
                    <p className="font-black text-slate-700 dark:text-white text-lg leading-tight">{sede.stats?.totalAlumnos ?? 0}</p>
                    <p className="text-xs text-emerald-500 font-bold">{sede.stats?.alumnosActivos ?? 0} activos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 font-semibold">Ingresos Mes</p>
                    <p className="font-black text-slate-700 dark:text-white text-base leading-tight">{formatCurrency(sede.stats?.ingresosMes ?? 0)}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      sede.estado_suscripcion === 'Activo'
                        ? 'bg-emerald-100 text-emerald-700'
                        : sede.estado_suscripcion === 'Suspendido'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {sede.estado_suscripcion || 'En Prueba'}
                    </span>
                  </div>

                  {/* Botón Administrar Sede */}
                  <button
                    onClick={() => irASede(sede.slug)}
                    className="flex items-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Administrar Sede
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
