'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Building2, Users, DollarSign, TrendingUp, AlertTriangle, 
  ArrowUpRight, Clock, CheckCircle2, XCircle, Rocket, ShieldCheck 
} from 'lucide-react';
import { toast } from 'sonner';

function formatearDinero(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor);
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar datos');
      setData(json.data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 md:p-12 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-1/4 mb-4"></div>
        <div className="h-4 bg-slate-100 rounded w-1/3 mb-10"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-3xl h-36 border border-slate-100"></div>
          ))}
        </div>
      </div>
    );
  }

  const { stats, actividadReciente } = data;

  return (
    <div className="flex-1 p-8 md:p-12 h-screen overflow-y-auto bg-slate-50/50 hide-scrollbar">
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-lime-100 text-lime-700 rounded-full text-xs font-bold uppercase tracking-widest mb-3">
            <ShieldCheck size={14} /> Centro de Comando
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Bienvenido, Super Admin
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-2 max-w-2xl leading-relaxed">
            Aquí tienes una vista panorámica del estado actual de Master Club Manager. Controla el crecimiento, los ingresos y la actividad de todas las academias deportivas suscritas a la plataforma.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/clubes" 
            className="bg-white text-slate-700 hover:text-slate-900 font-bold border border-slate-200 hover:border-slate-300 py-3 px-6 rounded-2xl transition-all shadow-sm text-sm"
          >
            Gestionar Clubes
          </Link>
          <Link 
            href="/admin/crm" 
            className="bg-lime-500 hover:bg-lime-600 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-sm flex items-center gap-2 text-sm"
          >
            <Rocket size={16} /> Lanzar CRM
          </Link>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* KPI 1: Ingresos del Mes */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
            <DollarSign size={80} className="text-lime-500" />
          </div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-lime-50 text-lime-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">MRR Actual (Mes)</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight relative z-10">
            {formatearDinero(stats.mrrActual)}
          </h3>
          <p className="text-[10px] text-lime-600 font-bold mt-2 relative z-10 bg-lime-50 inline-block px-2 py-0.5 rounded-md">
            Ingresos recurrentes cobrados
          </p>
        </div>

        {/* KPI 2: Total Clubes */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
            <Building2 size={80} className="text-blue-500" />
          </div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Academias</span>
          </div>
          <div className="flex items-end gap-3 relative z-10">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {stats.totalClubes}
            </h3>
            <span className="text-sm font-bold text-slate-500 mb-1">Registradas</span>
          </div>
          <div className="flex gap-2 mt-2 relative z-10 text-[10px] font-bold">
            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{stats.clubesActivos} Activos</span>
            <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">{stats.clubesPrueba} En Prueba</span>
          </div>
        </div>

        {/* KPI 3: Total Atletas */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
            <Users size={80} className="text-purple-500" />
          </div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Atletas</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight relative z-10">
            {stats.totalAtletas.toLocaleString('es-CO')}
          </h3>
          <p className="text-[10px] text-purple-600 font-bold mt-2 relative z-10 bg-purple-50 inline-block px-2 py-0.5 rounded-md">
            Usuarios finales activos
          </p>
        </div>

        {/* KPI 4: Deuda Pendiente */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <AlertTriangle size={80} className="text-red-500" />
          </div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Por Cobrar</span>
          </div>
          <h3 className="text-3xl font-black text-red-600 tracking-tight relative z-10">
            {formatearDinero(stats.deudaTotal)}
          </h3>
          <Link 
            href="/admin/cobranza" 
            className="text-[10px] text-red-600 hover:text-white hover:bg-red-500 font-bold mt-2 relative z-10 bg-red-50 inline-flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors"
          >
            Gestionar Cartera <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      {/* SECCIÓN INFERIOR: TABLA Y GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        
        {/* ÚLTIMOS PAGOS RECIBIDOS */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-lime-500" /> Últimos Pagos SaaS Recibidos
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Actividad transaccional reciente de los clubes</p>
            </div>
            <Link href="/admin/cobranza" className="text-xs font-bold text-lime-600 bg-lime-50 hover:bg-lime-100 px-4 py-2 rounded-xl transition-colors">
              Ver Todos
            </Link>
          </div>

          {actividadReciente.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <DollarSign size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-bold text-sm">Aún no hay pagos registrados en este periodo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Club</th>
                    <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                    <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Método</th>
                    <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {actividadReciente.map((pago: any) => (
                    <tr key={pago.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                            {pago.clubes?.nombre?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{pago.clubes?.nombre}</p>
                            <p className="text-[10px] font-semibold text-slate-400">@{pago.clubes?.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-sm font-medium text-slate-600">
                        {new Date(pago.fecha_pago).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-4">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase">
                          {pago.metodo_pago}
                        </span>
                      </td>
                      <td className="py-4 text-right font-black text-slate-900">
                        {formatearDinero(pago.monto_pagado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ESTADO DE LA PLATAFORMA */}
        <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8 flex flex-col">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-6">
            <Building2 size={20} className="text-blue-500" /> Distribución de Clubes
          </h3>
          
          <div className="flex-1 flex flex-col justify-center space-y-6">
            {/* Barra Activos */}
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-slate-700 flex items-center gap-2"><CheckCircle2 size={16} className="text-lime-500"/> Activos</span>
                <span className="text-slate-900">{stats.clubesActivos}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-lime-500 h-3 rounded-full transition-all duration-1000" 
                  style={{ width: `${stats.totalClubes > 0 ? (stats.clubesActivos / stats.totalClubes) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Barra Prueba */}
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-slate-700 flex items-center gap-2"><Clock size={16} className="text-orange-500"/> Periodo de Prueba</span>
                <span className="text-slate-900">{stats.clubesPrueba}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-orange-500 h-3 rounded-full transition-all duration-1000" 
                  style={{ width: `${stats.totalClubes > 0 ? (stats.clubesPrueba / stats.totalClubes) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Barra Eliminados / Inactivos */}
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-slate-700 flex items-center gap-2"><XCircle size={16} className="text-red-500"/> Inactivos / Bajas</span>
                <span className="text-slate-900">{stats.clubesEliminados}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-red-500 h-3 rounded-full transition-all duration-1000" 
                  style={{ width: `${stats.totalClubes > 0 ? (stats.clubesEliminados / stats.totalClubes) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <Link 
              href="/admin/publicidad" 
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-md"
            >
              Lanzar Nueva Campaña <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
