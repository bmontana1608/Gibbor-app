import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Trophy, TrendingUp, AlertTriangle, Building2, CheckCircle2 } from 'lucide-react';

interface MetricsDashboardProps {
  metrics: any;
}

export default function MetricsDashboard({ metrics }: MetricsDashboardProps) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* 1. Gráfico de Crecimiento SaaS */}
      <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm lg:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-emerald-500 w-5 h-5" /> 
              Ingresos SaaS (Últimos 6 meses)
            </h3>
            <p className="text-sm text-gray-500 mt-1">Comparativa de recaudo proyectado vs cobrado</p>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.ingresosHistoricos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="mes" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [`$${Number(value || 0).toLocaleString('es-CO')}`, '']}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
              <Bar dataKey="proyectado" name="Facturado (Proyección)" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={24} />
              <Bar dataKey="cobrado" name="Pagado (Recaudo Real)" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-rows-2 gap-6">
        {/* 2. Top 5 Academias */}
        <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <Trophy className="text-amber-500 w-5 h-5" /> 
            Top Academias
          </h3>
          <div className="flex-1 flex flex-col gap-3 justify-center">
            {metrics.topClubes?.length === 0 ? (
              <p className="text-sm text-gray-500 text-center">No hay datos suficientes</p>
            ) : (
              metrics.topClubes?.map((club: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                      index === 0 ? 'bg-amber-100 text-amber-600' :
                      index === 1 ? 'bg-slate-100 text-slate-600' :
                      index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]" title={club.nombre}>
                      {club.nombre}
                    </span>
                  </div>
                  <span className="text-xs font-black text-lime-600 bg-lime-50 px-2 py-1 rounded-md">
                    {club.alumnos} atletas
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Salud del Sistema (Churn & Status) */}
        <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <Activity className="text-blue-500 w-5 h-5" /> 
            Salud de la Red (Clubes)
          </h3>
          <div className="flex-1 grid grid-cols-2 gap-3 items-center">
             <div className="bg-emerald-50 rounded-xl p-3 flex flex-col justify-center border border-emerald-100">
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3 h-3" /> Activos
                </span>
                <span className="text-2xl font-black text-emerald-700">{metrics.distribucionEstados?.Activo || 0}</span>
             </div>
             <div className="bg-amber-50 rounded-xl p-3 flex flex-col justify-center border border-amber-100">
                <span className="text-xs font-bold text-amber-600 flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3 h-3" /> Pendientes
                </span>
                <span className="text-2xl font-black text-amber-700">{metrics.distribucionEstados?.Pendiente || 0}</span>
             </div>
             <div className="bg-rose-50 rounded-xl p-3 flex flex-col justify-center border border-rose-100 col-span-2">
                <div className="flex justify-between items-center w-full">
                  <div className="flex flex-col">
                     <span className="text-xs font-bold text-rose-600 mb-0.5">Churn Rate (Eliminados)</span>
                     <span className="text-lg font-black text-rose-700">{metrics.distribucionEstados?.Eliminado || 0} clubes</span>
                  </div>
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Trash2 className="text-rose-500 w-4 h-4" />
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
