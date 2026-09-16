'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, History, AlertTriangle, ShieldCheck, CheckCircle2, User } from 'lucide-react';

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarLogs();
  }, []);

  const cargarLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from('logs_auditoria').select('*').order('fecha', { ascending: false }).limit(100);
    setLogs(data || []);
    setLoading(false);
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <History className="text-slate-500" /> Registro de Auditoría
        </h2>
        <p className="text-sm text-gray-500 mt-1">Trazabilidad de acciones del sistema (100 eventos recientes)</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 text-slate-500 animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No hay registros de auditoría aún.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-6 py-4 w-48">Fecha / Hora</th>
                  <th className="text-left px-6 py-4 w-40">Usuario</th>
                  <th className="text-left px-6 py-4 w-32">Acción</th>
                  <th className="text-left px-6 py-4">Detalle Técnico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-mono text-xs text-gray-900">{new Date(log.fecha).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <User size={12} className="text-slate-400" />
                        </div>
                        <p className="text-xs font-bold text-slate-700 truncate" title={log.usuario_id || 'Sistema'}>
                          {(log.usuario_id && log.usuario_id.split('-')[0]) || 'Sistema'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                        log.accion.includes('CREATE') ? 'bg-emerald-100 text-emerald-700' :
                        log.accion.includes('DELETE') ? 'bg-red-100 text-red-700' :
                        log.accion.includes('UPDATE') ? 'bg-blue-100 text-blue-700' :
                        log.accion.includes('LOGIN') ? 'bg-violet-100 text-violet-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-600 truncate max-w-md" title={log.detalles}>
                        {log.detalles}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
