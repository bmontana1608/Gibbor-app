'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, TrendingUp, Users, Target, PhoneOff, Globe2, AlertTriangle, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AnalyticsView() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    // Para simplificar, obtenemos todos los registros y calculamos en memoria
    // En un escenario de millones de registros, esto debería hacerse con RPC o vistas materializadas
    const { data, error } = await supabase.from('atlas_academias').select('estado, prioridad, telefono, website, ciudad');
    
    if (error) {
      toast.error('Error cargando Analytics');
      setLoading(false);
      return;
    }

    const total = data.length;
    const clientes = data.filter(d => d.estado === 'Cliente').length;
    const prospectos = total - clientes;
    const sinTelefono = data.filter(d => !d.telefono).length;
    const sinWebsite = data.filter(d => !d.website).length;
    
    const prioridades = {
      muyAlta: data.filter(d => d.prioridad === 'Muy Alta').length,
      alta: data.filter(d => d.prioridad === 'Alta').length,
      media: data.filter(d => d.prioridad === 'Media').length,
      baja: data.filter(d => d.prioridad === 'Baja').length,
    };

    // Agrupar por ciudad
    const ciudadesObj: Record<string, number> = {};
    data.forEach(d => {
      const c = d.ciudad || 'Sin Ciudad';
      ciudadesObj[c] = (ciudadesObj[c] || 0) + 1;
    });
    
    const topCiudades = Object.entries(ciudadesObj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    setStats({
      total, clientes, prospectos, sinTelefono, sinWebsite, prioridades, topCiudades
    });
    setLoading(false);
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-lime-500" /></div>;
  if (!stats) return null;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900">Analytics</h2>
        <p className="text-slate-500 text-sm">Resumen de la prospección y base de datos Atlas.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Base Datos" value={stats.total} icon={<Database className="w-5 h-5 text-blue-500" />} bg="bg-blue-100" />
        <StatCard title="Leads (Prospectos)" value={stats.prospectos} icon={<Target className="w-5 h-5 text-orange-500" />} bg="bg-orange-100" />
        <StatCard title="Clientes" value={stats.clientes} icon={<Users className="w-5 h-5 text-green-500" />} bg="bg-green-100" />
        <StatCard title="Conversión" value={`${stats.total > 0 ? ((stats.clientes / stats.total) * 100).toFixed(1) : 0}%`} icon={<TrendingUp className="w-5 h-5 text-purple-500" />} bg="bg-purple-100" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm col-span-2">
          <h3 className="font-black text-slate-900 mb-6">Distribución por Prioridad</h3>
          <div className="flex gap-4 items-end h-40">
            <Bar label="Muy Alta" value={stats.prioridades.muyAlta} max={stats.total} color="bg-purple-500" />
            <Bar label="Alta" value={stats.prioridades.alta} max={stats.total} color="bg-red-500" />
            <Bar label="Media" value={stats.prioridades.media} max={stats.total} color="bg-orange-500" />
            <Bar label="Baja" value={stats.prioridades.baja} max={stats.total} color="bg-slate-300" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-900 mb-4">Calidad de Datos</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-center gap-2 text-red-700 font-medium">
                <PhoneOff className="w-4 h-4" /> Sin Teléfono
              </div>
              <span className="font-black text-red-700">{stats.sinTelefono}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2 text-amber-700 font-medium">
                <Globe2 className="w-4 h-4" /> Sin Website
              </div>
              <span className="font-black text-amber-700">{stats.sinWebsite}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="font-black text-slate-900 mb-4">Top 5 Ciudades</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stats.topCiudades.map(([ciudad, count]: [string, number], idx: number) => (
            <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <Building2 className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="font-bold text-slate-700 truncate" title={ciudad}>{ciudad}</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bg }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string, value: number, max: number, color: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-2 group">
      <span className="text-xs font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{value}</span>
      <div className="w-full bg-slate-100 rounded-t-lg relative flex-1 flex items-end overflow-hidden">
        <div className={`w-full ${color} rounded-t-lg transition-all duration-1000`} style={{ height: `${percentage}%` }}></div>
      </div>
      <span className="text-xs font-bold text-slate-600 truncate w-full text-center">{label}</span>
    </div>
  );
}
// Placeholder for the database icon import that was missing above
import { Database } from 'lucide-react';
