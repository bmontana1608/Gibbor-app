'use client';

import React, { useState, useEffect } from 'react';
import MetricsDashboard from '@/components/admin/MetricsDashboard';
import { Loader2, CreditCard, Activity, Users, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const MetricCard = ({ label, value, icon, sub, color }: { label: string, value: string | number, icon: any, sub: string, color: string }) => (
  <div className={`bg-white rounded-[2rem] p-6 shadow-sm border border-${color}-100 flex items-start gap-4 hover:-translate-y-1 transition-transform`}>
    <div className={`p-4 bg-${color}-50 text-${color}-600 rounded-2xl flex-shrink-0`}>{icon}</div>
    <div>
      <p className="text-gray-400 font-bold text-sm">{label}</p>
      <h3 className="text-2xl font-black text-gray-800">{value}</h3>
      <p className={`text-[10px] font-bold text-${color}-500 mt-1 uppercase tracking-wider`}>{sub}</p>
    </div>
  </div>
);

export default function MetricasPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/metrics')
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(err => {
        toast.error('Error cargando métricas');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-lime-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-800">Métricas Generales</h2>
        <p className="text-sm text-gray-500">Rendimiento financiero y operativo de MCM</p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard label="Recaudo SaaS" value={`$${metrics?.recaudoSaaS?.toLocaleString('es-CO') || '0'}`} icon={<CreditCard className="text-emerald-500" size={20} />} sub="Ingresos de Plataforma" color="emerald" />
        <MetricCard label="Volumen Transaccional" value={`$${metrics?.volumenTransaccional?.toLocaleString('es-CO') || '0'}`} icon={<Activity className="text-blue-500" size={20} />} sub="Flujo total de clubes" color="blue" />
        <MetricCard label="Jugadores" value={metrics?.totalJugadores || 0} icon={<Users className="text-lime-500" size={20} />} sub="Totales registrados" color="lime" />
        <MetricCard label="Clubes" value={`${metrics?.clubesActivos || 0}/${metrics?.totalClubes || 0}`} icon={<ShieldCheck className="text-violet-500" size={20} />} sub="Activos / Total" color="violet" />
      </section>

      <MetricsDashboard metrics={metrics} />
    </div>
  );
}
